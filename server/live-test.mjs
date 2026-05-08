import http from 'node:http';
import { writeFileSync } from 'node:fs';

const results = [];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 5000,
      path: `/api${path}`, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// All responses: { success, data }  or  { success, message }
const D = (r) => r.body?.data || {};

function record(feature, tcId, title, passed, actual) {
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}  [${tcId}] ${title}`);
  if (!passed) console.log(`        ↳ ${actual}`);
  results.push({ feature, tcId, title, actual, pass: passed ? 'Pass' : 'Fail' });
}

async function main() {
  console.log('\n══════ CRMS Sprint 3 — Live API Tests ══════\n');

  const ts = Date.now();
  let r;

  // ── Use seeded users where possible ────────────────────────────────────────
  // Admin & Lead Tech come from seed.js
  r = await request('POST', '/auth/login', { email:'admin@crms.test', password:'admin123' });
  const adminToken = D(r).token;

  r = await request('POST', '/auth/login', { email:'lead@crms.test', password:'lead123' });
  const techToken = D(r).token;

  r = await request('POST', '/auth/login', { email:'delivery@crms.test', password:'delivery123' });
  let deliveryToken = D(r).token;
  // If seeded delivery token gone, register a fresh one
  if (!deliveryToken) {
    r = await request('POST', '/auth/register', { name:'DM Fresh', email:`dm${ts}@t.com`, password:'pass1234', role:'DELIVERY_MAN' });
    deliveryToken = D(r).token;
  }

  // Register a fresh customer each run to avoid state conflicts
  r = await request('POST', '/auth/register', { name:'Customer', email:`c${ts}@t.com`, password:'pass1234', role:'CUSTOMER' });
  const customerToken = D(r).token;

  console.log(`Tokens — customer:${!!customerToken} tech:${!!techToken} delivery:${!!deliveryToken} admin:${!!adminToken}\n`);

  // ── Customer needs a device first, then create repairs with deviceId ────────
  r = await request('POST', '/devices', { dType:'LAPTOP', manufacturer:'Dell', model:'TestBook', serialNo:`SN${ts}` }, customerToken);
  const deviceId = D(r).device?._id;

  const mkRepair = (desc) => request('POST', '/repairs', { deviceId, issueDescription: desc, priority:'MEDIUM' }, customerToken);

  r = await mkRepair('Screen cracked');
  const repairId = D(r).repair?._id;

  // ── FEATURE 1: Bid Submission ───────────────────────────────────────────────
  console.log('─── Feature 1: Technician Bid Submission ───');

  // TC-BID-01 valid bid
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedAmount:1500, estimatedDays:3, message:'Quick fix' }, techToken);
  const bidId = D(r).bid?._id;
  record('Feature 1', 'TC-BID-01', 'Submit a valid bid', r.status===201 && !!bidId, `status=${r.status} bidId=${bidId}`);

  // TC-BID-02 missing amount
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedDays:2 }, techToken);
  record('Feature 1', 'TC-BID-02', 'Submit bid without Estimated Amount', r.status===400, `status=${r.status} msg=${r.body.message}`);

  // TC-BID-03 missing days
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedAmount:1000 }, techToken);
  record('Feature 1', 'TC-BID-03', 'Submit bid without Estimated Days', r.status===400, `status=${r.status}`);

  // TC-BID-04 negative amount (backend converts to Number — won't error unless validated)
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedAmount:-500, estimatedDays:2 }, techToken);
  const negBlocked = r.status === 400;
  record('Feature 1', 'TC-BID-04', 'Submit bid with negative amount', negBlocked, `status=${r.status} — ${negBlocked ? 'blocked' : 'NOT blocked by backend (no negative guard in controller)'}`);

  // TC-BID-05 no token
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedAmount:1000, estimatedDays:2 }, null);
  record('Feature 1', 'TC-BID-05', 'Submit bid without login', r.status===401, `status=${r.status}`);

  // TC-BID-06 customer tries to bid
  r = await request('POST', `/repairs/${repairId}/bids`, { estimatedAmount:1000, estimatedDays:2 }, customerToken);
  record('Feature 1', 'TC-BID-06', 'Submit bid as Customer role', r.status===403, `status=${r.status}`);

  // ── FEATURE 2: Customer Bid Management ─────────────────────────────────────
  console.log('\n─── Feature 2: Customer Bid Management ─────');

  // TC-CBID-01 customer views own bids
  r = await request('GET', `/repairs/${repairId}/bids`, null, customerToken);
  const bids = D(r).bids || [];
  record('Feature 2', 'TC-CBID-01', 'Customer views bids for their repair', r.status===200 && Array.isArray(bids), `status=${r.status} count=${bids.length}`);

  // TC-CBID-02 repair with no bids
  r = await mkRepair('Battery issue');
  const emptyRepairId = D(r).repair?._id;
  r = await request('GET', `/repairs/${emptyRepairId}/bids`, null, customerToken);
  const emptyBids = D(r).bids || [];
  record('Feature 2', 'TC-CBID-02', 'Customer views repair with no bids', r.status===200 && emptyBids.length===0, `status=${r.status} count=${emptyBids.length}`);

  // TC-CBID-03 wrong customer (use tech token — not owner)
  r = await request('GET', `/repairs/${repairId}/bids`, null, techToken);
  record('Feature 2', 'TC-CBID-03', "Customer cannot view another customer's bids", r.status===403, `status=${r.status}`);

  // TC-CBID-05 reject bid
  r = await request('PATCH', `/repairs/bids/${bidId}/reject`, {}, customerToken);
  record('Feature 2', 'TC-CBID-05', 'Customer rejects a bid', r.status===200, `status=${r.status} bidStatus=${D(r).bid?.status}`);

  // TC-CBID-06 accept already-rejected bid
  r = await request('PATCH', `/repairs/bids/${bidId}/accept`, {}, customerToken);
  record('Feature 2', 'TC-CBID-06', 'Accept already-rejected bid blocked', r.status===400 || r.status===403, `status=${r.status}`);

  // ── FEATURE 3: Bid Acceptance Workflow ─────────────────────────────────────
  console.log('\n─── Feature 3: Bid Acceptance Workflow ──────');

  // Fresh repair + 2 bids for acceptance test
  r = await mkRepair('Keyboard issue');
  const freshRepairId = D(r).repair?._id;

  r = await request('POST', `/repairs/${freshRepairId}/bids`, { estimatedAmount:2000, estimatedDays:4 }, techToken);
  const bidA = D(r).bid?._id;

  // Second tech — use junior seed or create via admin
  let techBToken;
  r = await request('POST', '/auth/login', { email:'junior@crms.test', password:'junior123' });
  techBToken = D(r).token;
  let bidB;
  if (techBToken) {
    r = await request('POST', `/repairs/${freshRepairId}/bids`, { estimatedAmount:1800, estimatedDays:3 }, techBToken);
    bidB = D(r).bid?._id;
  }

  // TC-CBID-04 accept bid A
  r = await request('PATCH', `/repairs/bids/${bidA}/accept`, {}, customerToken);
  record('Feature 2', 'TC-CBID-04', 'Customer accepts a valid bid', r.status===200, `status=${r.status} msg=${D(r).message}`);

  // TC-BAW-01 technician auto-assigned (message confirms)
  record('Feature 3', 'TC-BAW-01', 'Technician auto-assigned after bid acceptance', r.status===200 && D(r).message?.includes('accepted'), `status=${r.status} msg=${D(r).message}`);

  // TC-BAW-02 bid B auto-rejected
  if (bidB) {
    r = await request('GET', `/repairs/${freshRepairId}/bids`, null, customerToken);
    const allBids = D(r).bids || [];
    const bidBData = allBids.find(b => b._id === bidB);
    record('Feature 3', 'TC-BAW-02', 'Other bids auto-rejected', bidBData?.status==='REJECTED', `bidB status=${bidBData?.status}`);
  } else {
    record('Feature 3', 'TC-BAW-02', 'Other bids auto-rejected', false, 'Could not create 2nd tech bid (admin not available)');
  }

  // TC-BAW-03 delivery job auto-created
  r = await request('GET', `/delivery/by-repair/${freshRepairId}`, null, customerToken);
  const autoJob = D(r).job;
  record('Feature 3', 'TC-BAW-03', 'Delivery job auto-created after bid acceptance', r.status===200 && !!autoJob, `status=${r.status} jobStatus=${autoJob?.status}`);
  let deliveryJobId = autoJob?._id;

  // TC-BAW-04 cannot accept second bid (repair no longer PENDING)
  r = await request('PATCH', `/repairs/bids/${bidA}/accept`, {}, customerToken);
  record('Feature 3', 'TC-BAW-04', 'Cannot accept bid on non-PENDING repair', r.status===400 || r.status===403, `status=${r.status}`);

  // ── FEATURE 5: Delivery Man Role ───────────────────────────────────────────
  console.log('\n─── Feature 5: Delivery Man Role ───────────');

  r = await request('POST', '/auth/register', { name:'DM2', email:`dm2${ts}@t.com`, password:'pass1234', role:'DELIVERY_MAN' });
  record('Feature 5', 'TC-DLV-01', 'Delivery man self-registers', r.status===201 && D(r).user?.role==='DELIVERY_MAN', `status=${r.status} role=${D(r).user?.role}`);

  // TC-DLV-03 delivery token allows dashboard
  r = await request('GET', '/delivery/available', null, deliveryToken);
  record('Feature 5', 'TC-DLV-03', 'Delivery man can access delivery dashboard', r.status===200, `status=${r.status}`);

  // TC-DLV-04 customer blocked
  r = await request('GET', '/delivery/available', null, customerToken);
  record('Feature 5', 'TC-DLV-04', 'Non-delivery-man blocked from delivery dashboard', r.status===403, `status=${r.status}`);

  // ── FEATURE 6: Delivery Dashboard ──────────────────────────────────────────
  console.log('\n─── Feature 6: Delivery Dashboard ──────────');

  r = await request('GET', '/delivery/available', null, deliveryToken);
  const availJobs = D(r).jobs || [];
  record('Feature 6', 'TC-DASH-01', 'Dashboard shows available jobs', r.status===200 && Array.isArray(availJobs), `status=${r.status} count=${availJobs.length}`);

  r = await request('GET', '/delivery/my-jobs', null, deliveryToken);
  record('Feature 6', 'TC-DASH-03', 'Dashboard shows active jobs list', r.status===200, `status=${r.status}`);

  // ── FEATURE 7: Job Acceptance ───────────────────────────────────────────────
  console.log('\n─── Feature 7: Delivery Job Acceptance ──────');

  if (!deliveryJobId && availJobs.length > 0) deliveryJobId = availJobs[0]._id;

  if (deliveryJobId) {
    r = await request('POST', `/delivery/${deliveryJobId}/accept`, {}, deliveryToken);
    record('Feature 7', 'TC-DJOB-01', 'Delivery man accepts available job', r.status===200, `status=${r.status} newStatus=${D(r).job?.status}`);

    r = await request('GET', '/delivery/my-jobs', null, deliveryToken);
    const myJobs = D(r).jobs || [];
    record('Feature 6', 'TC-DASH-02', 'Active job appears in my-jobs after acceptance', r.status===200 && myJobs.length>0, `status=${r.status} count=${myJobs.length}`);

    r = await request('POST', `/delivery/${deliveryJobId}/accept`, {}, deliveryToken);
    record('Feature 7', 'TC-DJOB-02', 'Cannot accept already-taken job', r.status===400, `status=${r.status} msg=${r.body.message}`);

    r = await request('POST', `/delivery/${deliveryJobId}/accept`, {}, customerToken);
    record('Feature 7', 'TC-DJOB-03', 'Customer cannot accept delivery job', r.status===403, `status=${r.status}`);
  } else {
    ['TC-DJOB-01','TC-DJOB-02','TC-DJOB-03'].forEach(id =>
      record('Feature 7', id, 'Skipped — no delivery job', false, 'No available job found'));
    record('Feature 6', 'TC-DASH-02', 'Skipped', false, 'No job');
  }

  // ── FEATURE 8: Status Workflow ──────────────────────────────────────────────
  console.log('\n─── Feature 8: Delivery Status Workflow ─────');

  if (deliveryJobId) {
    r = await request('GET', `/delivery/${deliveryJobId}`, null, deliveryToken);
    const curStatus = D(r).job?.status;
    console.log(`  Current job status: ${curStatus}`);

    // TC-DSW-02 invalid skip
    r = await request('PATCH', `/delivery/${deliveryJobId}/status`, { status:'DELIVERED' }, deliveryToken);
    record('Feature 8', 'TC-DSW-02', 'Invalid status transition rejected', r.status===400, `status=${r.status} msg=${r.body.message}`);

    // TC-DSW-04 wrong user
    r = await request('PATCH', `/delivery/${deliveryJobId}/status`, { status:'PICKED_UP' }, techToken);
    record('Feature 8', 'TC-DSW-04', 'Only assigned delivery man can update status', r.status===403, `status=${r.status}`);

    // TC-DSW-01 valid transition
    if (curStatus === 'GOING_TO_CUSTOMER') {
      r = await request('PATCH', `/delivery/${deliveryJobId}/status`, { status:'PICKED_UP', note:'Device picked up' }, deliveryToken);
      record('Feature 8', 'TC-DSW-01', 'Valid: GOING_TO_CUSTOMER → PICKED_UP', r.status===200, `status=${r.status} newStatus=${D(r).job?.status}`);
      // TC-DSW-03
      r = await request('PATCH', `/delivery/${deliveryJobId}/status`, { status:'AT_WAREHOUSE', note:'At warehouse' }, deliveryToken);
      record('Feature 8', 'TC-DSW-03', 'Valid: PICKED_UP → AT_WAREHOUSE', r.status===200, `status=${r.status} newStatus=${D(r).job?.status}`);
    } else {
      record('Feature 8', 'TC-DSW-01', `Valid transition (job in ${curStatus})`, false, `Expected GOING_TO_CUSTOMER got ${curStatus}`);
      record('Feature 8', 'TC-DSW-03', 'Depends on TC-DSW-01', false, 'Skipped');
    }
  }

  // ── FEATURE 9: Status History ───────────────────────────────────────────────
  console.log('\n─── Feature 9: Delivery Status History ──────');
  if (deliveryJobId) {
    r = await request('GET', `/delivery/${deliveryJobId}`, null, deliveryToken);
    const hist = D(r).job?.statusHistory || [];
    record('Feature 9', 'TC-DHIST-01', 'Status history recorded after each update', hist.length>=1, `entries=${hist.length}`);
    record('Feature 9', 'TC-DHIST-02', 'Multiple history entries accumulate', hist.length>=2, `entries=${hist.length}`);
    if (adminToken) {
      r = await request('GET', `/delivery/${deliveryJobId}`, null, adminToken);
      record('Feature 9', 'TC-DHIST-03', 'Admin can read status history', r.status===200, `status=${r.status} entries=${D(r).job?.statusHistory?.length}`);
    }
  }

  // ── FEATURE 11: Tracking Visibility ────────────────────────────────────────
  console.log('\n─── Feature 11: Tracking Visibility ─────────');
  if (freshRepairId) {
    r = await request('GET', `/delivery/by-repair/${freshRepairId}`, null, customerToken);
    record('Feature 11', 'TC-DTRK-01', 'Customer views delivery tracking', r.status===200, `status=${r.status}`);

    if (adminToken) {
      r = await request('GET', `/delivery/by-repair/${freshRepairId}`, null, adminToken);
      record('Feature 11', 'TC-DTRK-02', 'Admin views delivery tracking', r.status===200, `status=${r.status}`);
    }
    if (techToken) {
      r = await request('GET', `/delivery/by-repair/${freshRepairId}`, null, techToken);
      record('Feature 11', 'TC-DTRK-03', 'Technician views delivery tracking', r.status===200, `status=${r.status}`);
    }
    // Customer B cannot see Customer A's repair
    r = await request('POST', '/auth/register', { name:'CustB', email:`cb${ts}@t.com`, password:'pass1234', role:'CUSTOMER' });
    const custBToken = D(r).token;
    r = await request('GET', `/delivery/by-repair/${freshRepairId}`, null, custBToken);
    record('Feature 11', 'TC-DTRK-04', "Other customer blocked from repair tracking", r.status===403, `status=${r.status}`);
  }

  // ── FEATURE 12: RBAC ────────────────────────────────────────────────────────
  console.log('\n─── Feature 12: Role-Based Access Control ────');

  r = await request('GET', '/delivery/available', null, customerToken);
  record('Feature 12', 'TC-RBAC-01', 'Customer blocked from delivery dashboard', r.status===403, `status=${r.status}`);

  r = await request('GET', '/delivery/available', null, null);
  record('Feature 12', 'TC-RBAC-03', 'Unauthenticated gets 401', r.status===401, `status=${r.status}`);

  if (deliveryJobId) {
    r = await request('PATCH', `/delivery/${deliveryJobId}/status`, { status:'PICKED_UP' }, customerToken);
    record('Feature 12', 'TC-RBAC-04', 'Customer cannot update delivery status', r.status===403, `status=${r.status}`);

    r = await request('POST', `/delivery/${deliveryJobId}/accept`, {}, techToken);
    record('Feature 12', 'TC-RBAC-05', 'Technician cannot accept delivery job', r.status===403, `status=${r.status}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter(x => x.pass==='Pass').length;
  console.log(`\n══════ RESULTS: ${passed}/${results.length} passed  |  ${results.length-passed} failed ══════\n`);
  results.forEach(x => console.log(`  ${x.pass==='Pass'?'✅':'❌'} [${x.tcId}] ${x.title} → ${x.actual}`));

  writeFileSync('./test-results.json', JSON.stringify(results, null, 2));
  console.log('\nSaved: test-results.json');
}

main().catch(console.error);
