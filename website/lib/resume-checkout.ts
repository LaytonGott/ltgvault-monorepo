// Unified Resume Builder Pro checkout function
// Use this everywhere an "Upgrade to Pro" button appears

export async function redirectToResumeProCheckout(): Promise<void> {
  try {
    // Get API key if user is logged in
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('ltgv_api_key') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool: 'resumebuilder' }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If not logged in, the API will return an error asking for email
      // In this case, redirect to pricing page as fallback
      if (data.error === 'Email is required') {
        // User not logged in - show a prompt or redirect to pricing
        const email = window.prompt('Enter your email to upgrade to Resume Builder Pro ($19 one-time):');
        if (!email) return;

        // Retry with email
        const retryResponse = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'resumebuilder', email }),
        });

        const retryData = await retryResponse.json();
        if (retryData.url) {
          window.location.href = retryData.url;
          return;
        }
        throw new Error(retryData.error || 'Failed to create checkout session');
      }
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    // Fallback to pricing page on error
    window.location.href = '/pricing.html';
  }
}
