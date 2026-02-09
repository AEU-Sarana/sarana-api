
const date = '2026-02-10';
const startOfDay = new Date(`${date}T00:00:00+07:00`);
const endOfDay = new Date(`${date}T23:59:59.999+07:00`);

console.log('Report Date:', date);
console.log('Expected Start (UTC): 2026-02-09T17:00:00.000Z');
console.log('Actual Start (UTC):  ', startOfDay.toISOString());
console.log('Expected End (UTC):  2026-02-10T16:59:59.999Z');
console.log('Actual End (UTC):    ', endOfDay.toISOString());

if (startOfDay.toISOString() === '2026-02-09T17:00:00.000Z' &&
    endOfDay.toISOString() === '2026-02-10T16:59:59.999Z') {
    console.log('Timezone calculation VERIFIED');
} else {
    console.log('Timezone calculation FAILED');
}
