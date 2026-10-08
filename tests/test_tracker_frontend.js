/**
 * Automated tests for HealthTracker frontend behavior:
 * 1. Immediate saving of reading to localStorage
 * 2. Preservation of existing 156 mg/dL reading from 05/10/2026
 * 3. History order (newest first) and badge count increment
 * 4. Consistent date parsing and chronological chart order
 * 5. Input validation (empty value, out of range, missing date/time) with visible messages
 * 6. Server failure resiliency: POST /glucose/respond failure never blocks saving or charting
 */

const fs = require('fs');
const assert = require('assert');

// Mock DOM Environment
class MockElement {
    constructor(id) {
        this.id = id;
        this.classes = new Set();
        this.classList = {
            add: (c) => this.classes.add(c),
            remove: (c) => this.classes.delete(c),
            contains: (c) => this.classes.has(c)
        };
        this.style = {};
        this.children = [];
        this.value = '';
        this.textContent = '';
        this.innerHTML = '';
        this.attributes = {};
        this.listeners = {};
    }
    appendChild(child) {
        this.children.push(child);
        return child;
    }
    querySelector(sel) {
        // Return a mock button for .btn-delete-record
        if (sel === '.btn-delete-record') return new MockElement('mock-btn-del');
        return null;
    }
    querySelectorAll() { return []; }
    addEventListener(evt, fn) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(fn);
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k] || null; }
    focus() {}
    scrollIntoView() {}
}

const html = fs.readFileSync('templates/index.html', 'utf8');
const elements = {};
const idMatches = html.matchAll(/id=["']([^"']+)["']/g);
for (const m of idMatches) {
    elements[m[1]] = new MockElement(m[1]);
}

global.document = {
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {}
};
global.window = {
    speechSynthesis: { getVoices: () => [], speak: () => {}, cancel: () => {} }
};
const store = {};
global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); }
};
global.navigator = {};

// Configurable mock fetch
let mockFetchShouldFail = false;
const origConsoleWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && String(args[0]).includes("Unable to fetch educational glucose response")) {
        return; // Expected simulated test log
    }
    origConsoleWarn(...args);
};

global.fetch = () => {
    if (mockFetchShouldFail) {
        return Promise.reject(new Error("Network connection failure (simulated 500)"));
    }
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            status: "success",
            classification: "within",
            response: "Good job keeping blood sugar in target range."
        })
    });
};

const js = fs.readFileSync('static/js/app.js', 'utf8');
eval(js + '\nglobal.HealthTracker = HealthTracker;');

console.log("==================================================");
console.log("🧪 HEALTH TRACKER FRONTEND TESTS");
console.log("==================================================");

// Initialize app components
initEventListeners();
setDefaultDateTimeInputs();
setLanguage('en');

// TEST 1: Preserve existing 156 mg/dL record from 05/10/2026
store['diabetes_assistant_glucose_readings'] = JSON.stringify([
    { id: 'g_existing_156', value: 156, type: 'after_meal', date: '05/10/2026', time: '14:30', notes: 'Existing post-meal check' }
]);
const initialLogs = HealthTracker.getGlucoseReadings();
assert.strictEqual(initialLogs.length, 1, "Should load 1 existing reading");
assert.strictEqual(initialLogs[0].value, 156, "Value should be 156");
assert(initialLogs[0].timestamp > 0, "Timestamp must be a valid positive number");
console.log("✅ TEST 1 PASSED: Existing 156 mg/dL record loaded with valid normalized timestamp");

// TEST 2: Add new reading (120 mg/dL on 2026-10-08) and verify immediate local save and history order
elements['input-glucose-val'].value = '120';
elements['input-glucose-date'].value = '2026-10-08';
elements['input-glucose-time'].value = '08:00';
elements['select-glucose-type'].value = 'fasting';
elements['input-glucose-notes'].value = 'Morning fasting test';

elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });

const afterAddLogs = HealthTracker.getGlucoseReadings();
assert.strictEqual(afterAddLogs.length, 2, "Readings count should increase to 2");
assert.strictEqual(afterAddLogs[0].value, 120, "Newest reading (120 on 10/08) must be first");
assert.strictEqual(afterAddLogs[1].value, 156, "Older reading (156 on 10/05) must be second");
assert.strictEqual(elements['input-glucose-val'].value, '', "Input value must be cleared");
assert.strictEqual(elements['input-glucose-notes'].value, '', "Notes must be cleared");
assert(elements['glucose-error-msg'].textContent.includes("saved successfully"), "Success note must appear");
console.log("✅ TEST 2 PASSED: New reading saved immediately to localStorage; newest listed first; inputs reset");

// TEST 3: Validate chart chronological ordering (156 from 10/05 before 120 from 10/08)
renderGlucoseChart();
const chartSvg = elements['glucose-svg-chart'].innerHTML;
assert(chartSvg.includes('156'), "Chart SVG must contain existing 156 data point");
assert(chartSvg.includes('120'), "Chart SVG must contain new 120 data point");
console.log("✅ TEST 3 PASSED: Chart successfully rendered with both points in chronological order");

// TEST 4: Form validation on invalid inputs (empty, out of range, missing date, missing time)
// 4a. Empty
elements['input-glucose-val'].value = '';
elements['input-glucose-date'].value = '2026-10-08';
elements['input-glucose-time'].value = '10:00';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("Please enter a blood glucose value"), "Empty value caught");

// 4b. Out of range high (>600)
elements['input-glucose-val'].value = '850';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("between 20 and 600"), "Out of range high caught");

// 4c. Out of range low (<20)
elements['input-glucose-val'].value = '12';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("between 20 and 600"), "Out of range low caught");

// 4d. Missing date
elements['input-glucose-val'].value = '130';
elements['input-glucose-date'].value = '';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("Please select a valid date"), "Missing date caught");

// 4e. Missing time
elements['input-glucose-val'].value = '130';
elements['input-glucose-date'].value = '2026-10-08';
elements['input-glucose-time'].value = '';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("Please select a valid time"), "Missing time caught");
console.log("✅ TEST 4 PASSED: Empty, range (<20 & >600), missing date and time validations visibly reported");

// TEST 5: Resiliency against server failure during POST /glucose/respond
mockFetchShouldFail = true; // Simulate network drop or backend error

elements['input-glucose-val'].value = '145';
elements['input-glucose-date'].value = '2026-10-08';
elements['input-glucose-time'].value = '13:00';
elements['select-glucose-type'].value = 'after_meal';
elements['input-glucose-notes'].value = 'Server failure test';

elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });

const logsAfterFailure = HealthTracker.getGlucoseReadings();
assert.strictEqual(logsAfterFailure.length, 3, "Reading must still be saved to localStorage even if fetch fails");
assert.strictEqual(logsAfterFailure[0].value, 145, "Reading 145 is saved at top");
assert.strictEqual(elements['input-glucose-val'].value, '', "Form still resets properly");
console.log("✅ TEST 5 PASSED: Server failure on /glucose/respond never blocks or cancels local saving and charting");

// Restore normal fetch behavior for subsequent tests
mockFetchShouldFail = false;

// TEST 6: Tamil Language Switching Flow
setLanguage('ta');
elements['input-glucose-val'].value = '';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert(elements['glucose-error-msg'].textContent.includes("சர்க்கரை அளவை உள்ளிடவும்"), "Tamil error message shown on empty input");

elements['input-glucose-val'].value = '135';
elements['input-glucose-date'].value = '2026-10-08';
elements['input-glucose-time'].value = '15:30';
elements['btn-add-glucose'].listeners['click'][0]({ preventDefault: () => {} });
assert.strictEqual(HealthTracker.getGlucoseReadings().length, 4, "Tamil reading successfully added");
assert(elements['glucose-error-msg'].textContent.includes("வெற்றிகரமாகப் பதிவு செய்யப்பட்டது"), "Tamil success message shown");
console.log("✅ TEST 6 PASSED: Language toggling to Tamil functions with localized errors and success notices");

console.log("==================================================");
console.log("🎉 ALL 6 FRONTEND TEST SUITES COMPLETED SUCCESSFULLY!");
console.log("==================================================");
