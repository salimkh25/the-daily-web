// category helpers shared by the public feed and the editor dashboard.
// some older articles use "Tech" / "Culture" / "Sports", so a nav link like
// "Technology" has to match those spellings too.

const ALIASES = [
  { test: /^tech/i, patterns: [/^tech/i, /^technology/i], label: 'Technology' },
  { test: /^(entertainment|culture)/i, patterns: [/^entertainment/i, /^culture/i], label: 'Entertainment' },
  { test: /^sport/i, patterns: [/^sport/i, /^sports/i], label: 'Sport' },
];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// returns a mongo condition for the category field, or null for "all"
function buildCategoryFilter(category) {
  const cat = (category || '').trim();
  if (!cat || cat.toLowerCase() === 'all') return null;
  const alias = ALIASES.find((a) => a.test.test(cat));
  if (alias) return { $in: alias.patterns };
  return new RegExp('^' + escapeRegex(cat) + '$', 'i'); // exact match, case-insensitive
}

// "tech" -> "Technology", "culture" -> "Entertainment", anything else unchanged
function displayCategory(category) {
  const cat = (category || '').trim();
  if (!cat) return '';
  const alias = ALIASES.find((a) => a.test.test(cat));
  return alias ? alias.label : cat;
}

module.exports = { buildCategoryFilter, displayCategory, escapeRegex };
