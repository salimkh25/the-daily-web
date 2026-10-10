// seed script - fills the db with demo data that shows off every requirement.
// run with: npm run seed
// WARNING: this deletes everything first (and logs everyone out) so dont run it on real data
//
// everything is generated here, no external files needed, and the articles are ORIGINAL text about
// fictional places/companies/teams (the spec only allows content we're allowed to use).
// images come from picsum.photos (free Unsplash photos). a seeded random generator makes every run
// produce the same data, so "the article with 3 updates" is the same one every time you demo.
//
// what it creates:
//   - 2 editors + 4 reporters
//   - 520 articles in all 8 sections and all 4 states: published, pending, returned, draft
//     (incl. edits of LIVE articles waiting for approval, to demo the side-by-side compare)
//   - published articles with 1-3 updates after publication (marked on the analytics chart)
//   - hourly view counts for the first week of every published article, with a bump after each update
//   - comments on published articles

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Article = require('../src/models/Article');
const Comment = require('../src/models/Comment');
const View = require('../src/models/View');
const { CATEGORIES } = require('../src/utils/categories');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();
const VIEW_WINDOW_HOURS = 7 * 24; // generate view stats for the first week after publication

// ---------- tiny seeded random generator (mulberry32) ----------
let seedState = 20260930;
function rand() {
  seedState |= 0; seedState = (seedState + 0x6D2B79F5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
function sample(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}
const fill = (template, ctx) => template.replace(/\{(\w+)\}/g, (_, key) => ctx[key]);

// ---------- fictional building blocks ----------
const PLACES = ['Northfield', 'Port Aurel', 'Eastvale', 'Cedar Bay', 'Kinsley', 'Marlow Heights', 'Ravenport', 'Lakemont', 'Ashford Vale', 'Brightwater', 'Stonebridge', 'Harbor Point'];
const COUNTRIES = ['Veloria', 'Estmark', 'Tarsen', 'Norvania', 'Caldora', 'Merrowland', 'Belgrana', 'Ostrevia'];
const COMPANIES = ['Brightline', 'Nordvik Energy', 'Halcyon Foods', 'Quillsoft', 'Arcadia Motors', 'Bluepeak Telecom', 'Ferro Steel', 'Lumen Labs', 'Orchard Retail', 'Tidewater Shipping'];
const TEAMS = ['Northfield United', 'Port Aurel Rovers', 'Eastvale City', 'Cedar Bay Athletic', 'Kinsley Town', 'Ravenport FC', 'Lakemont Wanderers', 'Stonebridge Albion'];
const FIRST = ['Maya', 'Omar', 'Lena', 'Daniel', 'Noa', 'Samir', 'Clara', 'Yosef', 'Rania', 'Tom', 'Aviva', 'Karim', 'Julia', 'Eli', 'Sara', 'Adam'];
const LAST = ['Haddad', 'Levin', 'Mansour', 'Carter', 'Nasser', 'Weiss', 'Farah', 'Brooks', 'Khoury', 'Adler', 'Saleh', 'Morgan'];
const FILMS = ['The Quiet Harbour', 'Glass Orchard', 'Northern Lights Hotel', 'Paper Kings', 'The Long Summer', 'Salt and Silver', 'Midnight Ferry', 'A House in Kinsley'];
const BANDS = ['The Lanterns', 'Velvet Tide', 'Copper Moon', 'The Northfield Six', 'Paper Boats', 'Blue Orchard'];
const person = () => `${pick(FIRST)} ${pick(LAST)}`;

// per section: headline, summary and paragraph templates. {slots} are filled from one context per
// article, so the place/company/team in the headline is the same one the body talks about.
const SECTIONS = {
  World: {
    headlines: [
      '{country} and {country2} agree to reopen border crossings',
      'Floods force thousands from their homes in northern {country}',
      '{country} forms first coalition government in a decade',
      'Aid convoy reaches {place} after week-long delay',
      'Talks between {country} and {country2} end without a deal',
      '{country} plans to halve fuel imports by 2030',
      'Protesters fill {country} capital over new housing law',
      'Earthquake shakes coastal towns in {country}, no injuries reported',
      '{country} and {country2} sign new trade agreement',
      'Wildfires in {country} under control after five days',
      'Rail link between {country} and {country2} opens to passengers',
      '{country} to hold snap election in the spring',
    ],
    summaries: [
      'Officials in {country} say the decision follows months of negotiations and pressure from local communities.',
      'The move affects around {number},000 people and is expected to take effect within weeks.',
      'Leaders described it as a turning point, while critics warned that key details are still unclear.',
    ],
    paragraphs: [
      'Government spokesperson {official} told reporters that the agreement had been "a long time coming" and thanked mediators from {country2}.',
      'Around {number},000 residents are directly affected, according to figures released by the interior ministry on {weekday}.',
      'Regional analysts say the change could reshape relations between {country} and its neighbours for years to come.',
      'In {place}, one of the areas most affected, residents queued from early morning to hear the announcement.',
      'International observers have been invited to monitor the process and are due to publish a first report next month.',
    ],
  },
  Politics: {
    headlines: [
      '{place} council approves new cycling network after long debate',
      'Parliament votes to extend free school meals programme',
      'Opposition calls for inquiry into {place} transport contracts',
      'New bill would cap yearly rent increases at {small}%',
      'Minister resigns after dispute over budget cuts',
      'Voter turnout in {place} hits record high',
      '{place} mayor unveils plan to build {number}00 affordable homes',
      'Cross-party group backs lower voting age of 16',
      'Budget includes extra funding for rural bus routes',
      'Council in {place} scraps controversial parking charges',
      'Petition to protect {place} green belt passes {number}0,000 signatures',
      'Government promises decision on new {place} hospital by summer',
    ],
    summaries: [
      'Supporters say the plan is overdue, but opponents question how it will be paid for.',
      'The vote passed by a narrow margin after a debate that lasted late into the night.',
      'The proposal now moves to a second reading, where amendments are expected.',
    ],
    paragraphs: [
      'Councillor {official} said the plan "puts residents first" and promised regular public updates on its progress.',
      'The opposition described the proposal as rushed and said it had not been properly costed.',
      'A public consultation drew more than {number},000 responses, the highest number the council has ever received.',
      'If approved, the first changes would come into force in {place} early next year.',
      'Political commentators say the issue is likely to feature heavily in the next local election campaign.',
    ],
  },
  Business: {
    headlines: [
      '{company} to create {number}00 jobs at new {place} factory',
      'Shares in {company} jump after strong quarterly results',
      '{company} and {company2} confirm merger talks',
      'Small businesses in {place} report busiest summer in years',
      'Central bank holds interest rate at {small}.25%',
      '{company} recalls {number},000 kettles over overheating fault',
      '{company} opens its first store in {place}',
      'Inflation falls for third month in a row',
      '{company} chief executive to step down next year',
      'Port of {place} handles record number of containers',
      '{company} invests in solar panels for all its warehouses',
      'Start-ups in {place} raise record funding in first half of year',
    ],
    summaries: [
      'The company says demand has grown faster than expected and it plans to expand further.',
      'Analysts had expected weaker figures, and the news was welcomed by investors.',
      'The decision is expected to affect suppliers and customers across the region.',
    ],
    paragraphs: [
      '{company} said the investment reflected "strong confidence" in the local economy and its workforce.',
      'Chief financial officer {official} told investors that costs had fallen while sales rose by {small} percent.',
      'Trade unions welcomed the announcement but asked for guarantees on pay and working conditions.',
      'Local business owners in {place} said they hoped the move would bring more visitors to the area.',
      'The firm expects the project to be completed within {small} years, subject to planning approval.',
    ],
  },
  Technology: {
    headlines: [
      '{company} unveils phone battery that charges in eight minutes',
      '{place} schools to teach coding from age seven',
      'Study finds most people never change default privacy settings',
      'Free app helps farmers in {place} predict frost',
      '{company} fixes security flaw affecting millions of routers',
      '{place} trials self-driving shuttle buses',
      '{company} launches translation earbuds for {number} languages',
      'Libraries in {place} lend out laptops to students',
      'New law requires apps to explain how they use personal data',
      '{company} opens artificial intelligence research lab in {place}',
      'Public wi-fi comes to every train station in {place}',
      '{company} to repair old phones instead of replacing them',
    ],
    summaries: [
      'Developers say the technology could reach ordinary users within a year.',
      'Experts welcomed the move but warned that security must come first.',
      'The project is part of a wider plan to make digital services easier to use.',
    ],
    paragraphs: [
      'Engineers at {company} said the breakthrough came after {small} years of testing in their {place} lab.',
      '"People should not need a computer science degree to stay safe online," said researcher {official}.',
      'Early trials with {number}00 volunteers showed the system worked reliably in everyday conditions.',
      'Privacy groups said they would be watching closely to see how user data is stored and protected.',
      'The service will be free during a trial period, after which pricing will be announced.',
    ],
  },
  Sport: {
    headlines: [
      '{team} clinch the title with a last-minute winner',
      '{team} sign young striker from {team2}',
      '{place} marathon draws a record {number},000 runners',
      '{team} coach steps down after five seasons',
      'Underdogs {team} knock holders {team2} out of the cup',
      'Swimmer {person} breaks national 200m record',
      '{team} and {team2} share the points in six-goal thriller',
      'New stadium for {team} gets final approval',
      '{person} wins national tennis championship in straight sets',
      '{team} unbeaten in {small}0 matches after win over {team2}',
      'Cyclist {person} takes stage win in {place}',
      'Womens team {team} reach first ever final',
    ],
    summaries: [
      'Fans celebrated late into the night after a dramatic finish.',
      'The result caps a remarkable season that few predicted.',
      'The club says it is already planning for next year.',
    ],
    paragraphs: [
      'The decisive moment came in the {minute}th minute, sending the travelling fans into raptures.',
      '"This group never gave up, not even for a second," said captain {official} after the final whistle.',
      '{team2} had the better of the early exchanges but could not turn their chances into goals.',
      'More than {number},000 supporters packed the stands, the biggest crowd of the season.',
      'Attention now turns to next month, when the team faces its toughest run of fixtures yet.',
    ],
  },
  Science: {
    headlines: [
      'Astronomers spot a comet that will be visible this winter',
      'Researchers in {place} grow drought-resistant wheat',
      'Deep-sea survey finds {small}0 new species off {country}',
      'Scientists map an ancient river beneath {place}',
      'Bees can recognise human faces, study suggests',
      'New telescope in {country} sends back its first images',
      'Fossil found near {place} may be a new dinosaur species',
      'Coral reefs off {country} show signs of recovery',
      'Students in {place} build satellite that reaches orbit',
      'Scientists create biodegradable plastic from seaweed',
      'Rare bird returns to {place} wetlands after 40 years',
      'Study links city trees to cooler summer nights',
    ],
    summaries: [
      'The findings were published in a peer-reviewed journal this week.',
      'Researchers say the discovery opens up new questions for future study.',
      'The team hopes the results will help protect ecosystems under pressure.',
    ],
    paragraphs: [
      'Lead author {official} said the team was "genuinely surprised" by how clear the results were.',
      'The research took {small} years and involved scientists from {country} and {country2}.',
      'Samples collected near {place} were analysed using techniques developed specifically for the project.',
      'Other experts cautioned that more data is needed before firm conclusions can be drawn.',
      'The team plans a second expedition next year to confirm the findings.',
    ],
  },
  Health: {
    headlines: [
      '{place} hospital cuts waiting times with evening clinics',
      'Walking 7,000 steps a day linked to longer life, study says',
      'Flu vaccine campaign opens early this year',
      'New mental health helpline for students launches in {place}',
      'Doctors warn of heat risk as temperatures climb',
      'Trial shows promise for new migraine treatment',
      '{place} opens its first 24-hour pharmacy',
      'Free eye tests for over-60s extended for another year',
      'School in {place} swaps sugary drinks for water fountains',
      'Number of blood donors rises by {small}0%',
      'Nurses in {place} trial four-day week',
      'New guidance on children and screen time published',
    ],
    summaries: [
      'Health officials say early results are encouraging.',
      'Experts stress that simple daily habits can make a big difference.',
      'The service is free and available to everyone in the region.',
    ],
    paragraphs: [
      'Dr {official}, who led the project, said patients had responded "overwhelmingly positively".',
      'More than {number},000 people took part, making it one of the largest studies of its kind.',
      'The health ministry said it would review the results before deciding whether to expand the scheme.',
      'Patient groups in {place} welcomed the news but called for more staff to keep services running.',
      'Anyone with concerns is advised to speak to their GP or call the national health line.',
    ],
  },
  Entertainment: {
    headlines: [
      '"{film}" tops the box office in its opening weekend',
      'Folk band {band} announce reunion tour',
      '{place} film festival reveals this year\'s line-up',
      'Debut novel by {person} wins national literary prize',
      'Streaming hit "{film}" renewed for a second season',
      'Open-air concert in {place} draws {number}0,000 fans',
      '{band} release first album in a decade',
      '"{film}" director {person} to make next film in {place}',
      'Museum in {place} reopens after two-year renovation',
      'Comedy series set in {place} begins filming',
      'Theatre in {place} celebrates 100 years',
      '{band} to headline the {place} summer festival',
    ],
    summaries: [
      'Critics and audiences alike have given it a warm reception.',
      'Tickets are expected to sell out quickly, organisers say.',
      'It marks a major moment for the local arts scene.',
    ],
    paragraphs: [
      'Speaking at the premiere, {official} said the project had been "a labour of love" for everyone involved.',
      'Early reviews praised the performances and the striking photography of {place}.',
      'Organisers expect around {number},000 visitors over the course of the event.',
      'The announcement was made on social media, where fans reacted with excitement.',
      'Tickets go on sale on {weekday} through the official website.',
    ],
  },
};

const GENERIC_PARAGRAPHS = [
  'More details are expected to be released in the coming days.',
  'The Daily Web has contacted the relevant authorities for further comment.',
  'It is the latest in a series of developments that have drawn attention across the region.',
  'Residents who want to share their views can take part in an online survey open until the end of the month.',
];
const UPDATE_LINES = [
  'This article has been updated with new figures released by officials.',
  'This article has been updated with comments from {official}.',
  'This article was updated to correct the date of the next meeting.',
  'This article has been updated with the latest developments.',
];
const RETURN_NOTES = [
  'Please add a second source for the figures in the second paragraph.',
  'The headline overstates the story - tone it down a little.',
  'We need a quote from the other side before this can run.',
  'Check the spelling of the names and the dates, some look wrong.',
  'Summary is too long, keep it to two short lines.',
  'Good piece, but please add a photo and cut the last paragraph.',
];
const COMMENT_NAMES = ['Dana', 'Yousef', 'Michal', 'Ahmad', 'Ruth', 'Nadia', 'Itai', 'Lina', 'Jonathan', 'Hiba', 'Avi', 'Maryam', 'Chris', 'Reem', 'Gal', 'Tamar'];
const COMMENT_TEXTS = [
  'Really interesting read, thanks.',
  'Good summary of what is going on.',
  'I did not know about this at all.',
  'Finally some good news!',
  'Would love a follow-up on this story.',
  'Great reporting as always.',
  'Not sure I agree, but a fair article.',
  'This affects my town directly, glad someone is covering it.',
  'The photo is amazing.',
  'Can you share where the numbers come from?',
  'Been following this for weeks, nice to see an update.',
  'Clear and easy to read, thank you.',
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ---------- article content ----------
const usedTitles = new Set();

function makeContent(category, index) {
  const section = SECTIONS[category];
  const places = sample(PLACES, 2);
  const countries = sample(COUNTRIES, 2);
  const companies = sample(COMPANIES, 2);
  const teams = sample(TEAMS, 2);
  const ctx = {
    place: places[0], place2: places[1], country: countries[0], country2: countries[1],
    company: companies[0], company2: companies[1], team: teams[0], team2: teams[1],
    person: person(), official: person(), film: pick(FILMS), band: pick(BANDS),
    number: int(2, 9), small: int(2, 6), minute: int(80, 94), weekday: pick(WEEKDAYS),
  };

  let title;
  for (let tries = 0; tries < 50; tries++) {
    title = fill(pick(section.headlines), ctx);
    if (!usedTitles.has(title)) break;
    // same headline again - reshuffle the names and try another one
    Object.assign(ctx, { place: pick(PLACES), country: pick(COUNTRIES), company: pick(COMPANIES), team: pick(TEAMS), person: person(), number: int(2, 9), small: int(2, 6) });
  }
  usedTitles.add(title);

  const paragraphs = sample(section.paragraphs, int(3, 4)).concat(sample(GENERIC_PARAGRAPHS, int(1, 2)));
  return {
    ctx,
    title,
    summary: fill(pick(section.summaries), ctx),
    body: paragraphs.map((p) => fill(p, ctx)).join('\n\n'),
    image: `https://picsum.photos/seed/tdw-${index}/800/450`,
    category,
  };
}

// ---------- view statistics ----------
function hourStart(ms) {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

// hourly counts for the first week: busy at first, then fading, quieter at night,
// and a clear bump after every published update (what Impact Analytics is about)
function makeViews(articleId, publishedAt, updates, popularity) {
  const start = hourStart(publishedAt);
  const hours = Math.min(VIEW_WINDOW_HOURS, Math.floor((NOW - start) / HOUR) + 1);
  const decay = 18 + rand() * 30;
  const docs = [];
  let total = 0;
  for (let h = 0; h < hours; h++) {
    const t = start + h * HOUR;
    const hourOfDay = new Date(t).getHours();
    const daily = 0.3 + Math.max(0, Math.sin((Math.PI * (hourOfDay - 6)) / 18)); // low at night
    let level = popularity * Math.exp(-h / decay);
    for (const u of updates) {
      const since = (t - u) / HOUR;
      if (since >= 0) level += popularity * 0.9 * Math.exp(-since / 12);
    }
    const count = Math.round(level * daily * (0.75 + rand() * 0.5));
    if (count > 0) {
      docs.push({ _id: new mongoose.Types.ObjectId(), article: articleId, bucket: new Date(t), count, __v: 0 });
      total += count;
    }
  }
  return { docs, total };
}

// update times spread over the view window, at least 8h apart
function makeUpdates(publishedAt, howMany) {
  const windowHours = Math.min(VIEW_WINDOW_HOURS, (NOW - publishedAt) / HOUR);
  if (windowHours < 20 || howMany === 0) return [];
  const times = [];
  for (let tries = 0; times.length < howMany && tries < 40; tries++) {
    const t = publishedAt + (8 + rand() * (windowHours - 14)) * HOUR;
    if (times.every((x) => Math.abs(x - t) > 8 * HOUR)) times.push(t);
  }
  return times.sort((a, b) => a - b);
}

async function insertInChunks(collection, docs, size = 5000) {
  for (let i = 0; i < docs.length; i += size) {
    await collection.insertMany(docs.slice(i, i + size), { ordered: false });
  }
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set - create a .env file first (see README).');
  await mongoose.connect(uri);
  await Promise.all([User.init(), Article.init(), Comment.init(), View.init()]); // make sure indexes exist (text search!)

  console.log('Clearing existing data...');
  await Promise.all([User.deleteMany({}), Article.deleteMany({}), Comment.deleteMany({}), View.deleteMany({})]);
  await mongoose.connection.db.collection('sessions').deleteMany({}); // old logins point at deleted users

  console.log('Creating users...');
  const editors = [
    await User.create({ username: 'salom2', password: '12345678', role: 'editor', displayName: 'Editor Boss' }),
    await User.create({ username: 'editor2', password: 'password', role: 'editor', displayName: 'Second Editor' })
  ];
  const reporters = [
    await User.create({ username: 'salim', password: '12345678', role: 'reporter', displayName: 'Salim K' }),
    await User.create({ username: 'reporter2', password: 'password', role: 'reporter', displayName: 'John Smith' }),
    await User.create({ username: 'reporter3', password: 'password', role: 'reporter', displayName: 'Noa Levin' }),
    await User.create({ username: 'reporter4', password: 'password', role: 'reporter', displayName: 'Karim Haddad' }),
  ];

  // how many of each kind (520 in total)
  const PLAN = [
    { kind: 'published', count: 382 },
    { kind: 'live-pending', count: 12 },  // live article + an edit waiting for approval
    { kind: 'live-returned', count: 6 },  // live article + an edit sent back with a note
    { kind: 'pending', count: 30 },
    { kind: 'returned', count: 30 },
    { kind: 'draft', count: 60 },
  ];

  const articles = [];
  const views = [];
  const comments = [];
  let index = 0;
  let multiUpdate = 0;

  for (const { kind, count } of PLAN) {
    for (let n = 0; n < count; n++, index++) {
      const category = CATEGORIES[index % CATEGORIES.length];
      const content = makeContent(category, index);
      const author = reporters[index % 7 < 3 ? 0 : index % reporters.length]._id; // salim writes a bit more
      const _id = new mongoose.Types.ObjectId();
      const doc = {
        _id, author, status: 'draft', editorNote: '', viewsCount: 0, updates: [], published: {}, __v: 0,
        title: content.title, summary: content.summary, body: content.body, image: content.image, category,
      };

      if (kind === 'published' || kind.startsWith('live')) {
        // newest articles most likely: squared random pushes most dates close to now
        const publishedAt = NOW - Math.pow(rand(), 1.6) * 30 * DAY - int(1, 6) * HOUR;
        // ~30% have updates; the first 25 of those get 2-3 so the chart has several markers
        let howMany = 0;
        if (rand() < 0.3) howMany = multiUpdate < 25 ? int(2, 3) : 1;
        const updates = makeUpdates(publishedAt, howMany);
        if (updates.length > 1) multiUpdate++;

        // the live body mentions each update, like a real news site
        let liveBody = content.body;
        updates.forEach((u) => {
          const when = new Date(u).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          liveBody = `Update ${when}: ${fill(pick(UPDATE_LINES), content.ctx)}\n\n${liveBody}`;
        });

        Object.assign(doc, {
          status: 'published',
          body: liveBody,
          publishedAt: new Date(publishedAt),
          updates: updates.map((u) => new Date(u)),
          published: { title: doc.title, summary: doc.summary, body: liveBody, image: doc.image, category },
          createdAt: new Date(publishedAt - int(2, 30) * HOUR),
          updatedAt: new Date(updates.length ? updates[updates.length - 1] : publishedAt),
        });

        const popularity = 4 + Math.pow(rand(), 2) * 60;
        const v = makeViews(_id, publishedAt, updates, popularity);
        views.push(...v.docs);
        doc.viewsCount = v.total;

        if (kind !== 'published') {
          // the reporter edited the live article: working copy differs, readers still see `published`
          doc.status = kind === 'live-pending' ? 'pending' : 'returned';
          doc.title = `${doc.title} - latest`;
          doc.summary = `${doc.summary} New details have emerged since the story was first published.`;
          doc.body = `Latest: ${fill(pick(UPDATE_LINES), content.ctx)} ${fill(pick(GENERIC_PARAGRAPHS), content.ctx)}\n\n${liveBody}`;
          doc.updatedAt = new Date(NOW - int(1, 20) * HOUR);
          if (kind === 'live-returned') doc.editorNote = pick(RETURN_NOTES);
        }

        // readers' comments, after publication
        for (let c = 0, many = rand() < 0.6 ? int(1, 6) : 0; c < many; c++) {
          const at = new Date(Math.min(NOW, publishedAt + rand() * 3 * DAY));
          comments.push({ _id: new mongoose.Types.ObjectId(), article: _id, author: pick(COMMENT_NAMES), body: pick(COMMENT_TEXTS), createdAt: at, updatedAt: at, __v: 0 });
        }
      } else {
        const created = NOW - rand() * 10 * DAY;
        doc.status = kind;
        doc.createdAt = new Date(created);
        doc.updatedAt = new Date(Math.min(NOW, created + rand() * 2 * DAY));
        if (kind === 'returned') doc.editorNote = pick(RETURN_NOTES);
        // some drafts are still half-written (drafts may be incomplete)
        if (kind === 'draft' && n % 6 === 0) {
          doc.summary = '';
          doc.body = doc.body.split('\n\n')[0];
          if (n % 12 === 0) doc.category = '';
        }
      }
      articles.push(doc);
    }
  }

  // bulk inserts straight into the collections - thousands of documents in seconds.
  // (bypassing mongoose here lets us set createdAt/updatedAt in the past)
  console.log(`Inserting ${articles.length} articles, ${comments.length} comments, ${views.length} view buckets...`);
  await insertInChunks(Article.collection, articles);
  await insertInChunks(Comment.collection, comments);
  await insertInChunks(View.collection, views);

  const count = (fn) => articles.filter(fn).length;
  console.log('\n=== Seed complete ===');
  console.log(`  Articles:      ${articles.length}  (published ${count((a) => a.status === 'published')}, pending ${count((a) => a.status === 'pending')}, returned ${count((a) => a.status === 'returned')}, draft ${count((a) => a.status === 'draft')})`);
  console.log(`  Live articles with an edit awaiting review: ${count((a) => a.publishedAt && a.status !== 'published')}`);
  console.log(`  Articles updated after publication: ${count((a) => a.updates.length > 0)} (${count((a) => a.updates.length > 1)} with 2-3 updates)`);
  console.log(`  Comments:      ${comments.length}`);
  console.log(`  View buckets:  ${views.length}`);
  console.log('\n=== Demo logins ===');
  console.log(`  Editors:   salom2 / 12345678, editor2 / password`);
  console.log('  Reporters: salim / 12345678, reporter2 / password, reporter3 / password, reporter4 / password');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
