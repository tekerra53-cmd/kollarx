// Fallback API base URL for static deployments and client-side code.
// When Flask renders the page, it will inject API_BASE in templates/base.html.
// When the page is served as a static asset without backend rendering,
// this file ensures the value exists to avoid runtime errors.
window.API_BASE = window.API_BASE || "";
