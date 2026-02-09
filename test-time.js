
function pad2(value) {
    return value.toString().padStart(2, '0');
}

function testTime(h, m) {
    const now = new Date();
    now.setUTCHours(h);
    now.setUTCMinutes(m);

    const timeZone = 'Asia/Phnom_Penh';
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now);
    const lookup = (type) => parts.find(part => part.type === type)?.value ?? '';
    const dateStr = `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
    const timeStr = `${lookup('hour')}:${lookup('minute')}`;

    console.log(`UTC ${pad2(h)}:${pad2(m)} -> Phnom Penh ${dateStr} ${timeStr}`);
}

console.log('Testing various times around midnight with hourCycle: h23:');
testTime(16, 59);
testTime(17, 0); // Midnight
testTime(17, 1);
testTime(17, 59);
testTime(18, 0); // 1 AM
testTime(18, 1);
