// Exercises the host-injected layout diagnostic with representative rendered bounds.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('DMS/Services/MenuOutputService.cs', 'utf8');
const script = source.match(/LayoutDiagnosticScript = """([\s\S]*?)"""/)[1];
const rect = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, height });
const box = (r, minHeight = r.height, text = 'menu') => ({ textContent: text, minHeight, getBoundingClientRect: () => r });
const image = r => ({ getBoundingClientRect: () => r });
function check(boxes, images = []) {
  const page = { getBoundingClientRect: () => rect(0, 0, 794, 1123), querySelectorAll: q => q === '.box' ? boxes : images };
  return vm.runInNewContext(script, { document: { querySelector: () => page }, getComputedStyle: n => ({ minHeight: `${n.minHeight}px` }) });
}
assert.strictEqual(check([box(rect(10, 10, 200, 30)), box(rect(10, 50, 200, 30))]), false);
assert.strictEqual(check([box(rect(10, 10, 200, 50), 30)]), true, 'text taller than its box');
assert.strictEqual(check([box(rect(10, 10, 200, 30)), box(rect(20, 20, 200, 30))]), true, 'text boxes overlap');
assert.strictEqual(check([box(rect(10, 1110, 200, 30))]), true, 'text extends off page');
assert.strictEqual(check([box(rect(10, 10, 200, 30)), box(rect(10, 10, 200, 30), 30, '')]), false, 'empty menu boxes do not overlap');
assert.strictEqual(check([box(rect(10, 10, 200, 30))], [image(rect(0, 0, 200, 200))]), false, 'image behind text is intentional');
assert.strictEqual(check([], [image(rect(790, 0, 50, 50))]), true, 'image extends off page');
console.log('PASS: template output layout diagnostic');
