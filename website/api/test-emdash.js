// Test endpoint to verify em dash replacement
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Test string with em dashes
  const testInput = `This is a test — with em dashes — and more content – plus en-dash.

I used to think productivity meant working more hours — but I was wrong.

The truth is — focus beats hustle.`;

  function cleanContent(text) {
    if (!text) return text;
    let cleaned = text.replace(/—/g, ', ');
    cleaned = cleaned.replace(/–/g, ', ');
    cleaned = cleaned.replace(/ , /g, ', ');
    cleaned = cleaned.replace(/,,/g, ',');
    return cleaned;
  }

  const cleaned = cleanContent(testInput);

  // Check if any em dashes remain
  const hasEmDash = cleaned.includes('—') || cleaned.includes('–');

  return res.status(200).json({
    original: testInput,
    cleaned: cleaned,
    hasEmDashRemaining: hasEmDash,
    emDashFound: (testInput.match(/—/g) || []).length,
    enDashFound: (testInput.match(/–/g) || []).length
  });
};
