// Visitor counter script - fetches count from API Gateway
const API_ENDPOINT = "https://jtfl70z8wd.execute-api.eu-central-1.amazonaws.com/visitor-count"

// Update counter on every page navigation (including SPA navigation)
document.addEventListener("nav", async () => {
  try {
    const response = await fetch(API_ENDPOINT)
    if (!response.ok) throw new Error('Network response was not ok')

    const data = await response.json()
    const counters = document.querySelectorAll('.visit-count')
    counters.forEach(counter => {
      counter.textContent = `Visits: ${data.visits || 'Unknown'}`
    })
  } catch (error) {
    console.error('Error fetching visits count:', error)
    const counters = document.querySelectorAll('.visit-count')
    counters.forEach(counter => {
      counter.textContent = 'Visits counter unavailable'
    })
  }
})
