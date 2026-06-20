/**
 * categorize.js — infer a spending category from a transaction's description.
 *
 * Bank CSVs rarely include a category, so we keyword-match the merchant /
 * memo text. Income is always "Income". Anything unmatched falls back to
 * "Other" (never a blank "Uncategorized").
 */

// Ordered list — the first group whose keyword appears in the description wins.
// More specific groups (Subscriptions, Utilities) come before broad ones.
const RULES = [
  ['Subscriptions', ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'hbo', 'max ', 'paramount', 'peacock', 'audible', 'patreon', 'apple.com', 'icloud', 'prime video', 'adobe', 'dropbox', 'onlyfans', 'twitch', 'chatgpt', 'openai', 'notion', 'substack']],
  ['Utilities', ['comcast', 'xfinity', 'verizon', 'at&t', 'att ', 't-mobile', 'tmobile', 'puget sound energy', 'pse ', 'electric', 'energy', 'water dept', 'utility', 'utilities', 'internet', 'wireless', 'centurylink', 'sewer', 'waste', 'garbage']],
  ['Groceries', ['trader joe', 'whole foods', 'safeway', 'kroger', 'costco', 'walmart', 'grocery', 'qfc', 'fred meyer', 'aldi', 'wholefds', 'supermarket', 'food market', 'winco', 'sprouts', 'h mart', 'h-mart']],
  ['Dining', ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'chipotle', 'doordash', 'uber eats', 'ubereats', 'grubhub', 'pizza', 'burger', 'grill', 'taco', 'deli', 'dunkin', 'panera', 'subway', 'chick-fil', 'wendys', 'kfc', 'bar &', 'brewing', 'bakery', 'sushi', 'thai', 'ramen']],
  ['Transport', ['shell', 'chevron', 'exxon', 'mobil', 'arco', 'bp ', '76 ', 'gas station', 'fuel', 'uber trip', 'uber *', 'lyft', 'transit', 'parking', 'toll', 'metro', 'amtrak', 'delta air', 'united air', 'american air', 'alaska air', 'southwest', 'airline', 'car wash']],
  ['Shopping', ['amazon', 'amzn', 'target', 'best buy', 'ebay', 'etsy', 'nike', 'h&m', 'macy', 'nordstrom', 'ikea', 'home depot', 'lowes', 'wayfair', 'apple store', 'gamestop', 'sephora', 'ulta']],
  ['Health', ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'medical', 'dental', 'dentist', 'clinic', 'hospital', 'fitness', 'gym', 'planet fit', 'la fitness', 'peloton', 'optometr', 'vision', 'urgent care']],
  ['Entertainment', ['cinema', 'movie', 'amc ', 'regal', 'theater', 'theatre', 'steam', 'playstation', 'xbox', 'nintendo', 'ticketmaster', 'concert', 'stubhub', 'event', 'museum', 'arcade', 'bowling']],
  ['Transfers', ['venmo', 'zelle', 'paypal', 'cash app', 'cashapp', 'transfer', 'atm ', 'withdrawal', 'wire ', 'ach ']],
  ['Bills', ['insurance', 'geico', 'progressive', 'state farm', 'allstate', 'loan', 'mortgage', 'rent ', 'rental', 'student loan', 'credit card payment', 'autopay']],
];

/**
 * @param {string} description merchant / memo text
 * @param {string} type 'income' | 'expense'
 * @returns {string} category name
 */
export function categorize(description, type) {
  if (type === 'income') {
    return 'Income';
  }
  const text = String(description || '').toLowerCase();
  if (!text) {
    return 'Other';
  }
  for (const [category, keywords] of RULES) {
    if (keywords.some(k => text.includes(k))) {
      return category;
    }
  }
  return 'Other';
}

export default categorize;
