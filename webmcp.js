/*
 * WebMCP — Mark Andrew Boudoir
 * ---------------------------------------------------------------------------
 * Exposes this site's key actions to AI agents (browser-based assistants) as
 * structured "tools" they can call, instead of guessing by clicking around.
 *
 * It implements the WebMCP browser API. The spec is still settling, so we
 * support both shapes:
 *   - navigator.modelContext  (Chrome's early-preview build + the proposal)
 *   - document.modelContext   (the current editor's-draft IDL)
 * and both registration styles:
 *   - provideContext({ tools }) — register the whole set at once (preferred)
 *   - registerTool(tool)        — register one tool at a time (fallback)
 *
 * Single source of truth: this one file is included on every page via
 *   <script src="/webmcp.js" defer></script>
 * so to change what agents can do, you only edit here.
 *
 * NOTE: the facts below (pricing, session details, contact) mirror /llms.txt
 * and the public site copy. If those change, update them here too.
 * ---------------------------------------------------------------------------
 */
(function () {
  "use strict";

  // Don't register twice if the script somehow loads more than once.
  if (window.__markAndrewWebMCPLoaded) return;
  window.__markAndrewWebMCPLoaded = true;

  var SITE = "https://www.markandrewboudoir.com";
  var BOOKING_URL = SITE + "/#book";
  var BOOKING_CALENDAR =
    "https://link.disruptormarketing.io/widget/booking/b7eSmyInmj2pwqIQesEp";

  // --- Reusable copy (kept in sync with /llms.txt) --------------------------
  var PRICING =
    "It's $499 to reserve your session date — that covers the full-day " +
    "experience plus all prep and planning. Your images are purchased " +
    "separately at your same-day reveal, based on what you love most; most " +
    "clients invest $1,000–$2,000. Affirm payment plans are available to " +
    "spread the cost. Destination / travel boudoir sessions (e.g. New York " +
    "City, St. Louis, London, Paris, Rome) start at $8,800.";

  var SESSION_DETAILS =
    "A Mark Andrew Boudoir session is a full, guided day — no modeling " +
    "experience needed, because every pose is directed head-to-toe. A " +
    "typical day: arrive around 9am, professional hair & makeup with artist " +
    "Aletheia Jean, then 3 outfits across 3 sets (about 90 minutes of " +
    "shooting), lunch, and a same-day reveal where you view your fully " +
    "edited gallery (around 130–160 images) on a 65-inch 4K TV before you " +
    "leave. Sessions are available for women, couples, men, bridal, and " +
    "maternity. The style is timeless old-Hollywood glamour — tasteful and " +
    "classy by default, and as bold as you'd like. Heirloom albums " +
    "(including the signature acrylic album covers), wall art, fine-art and " +
    "metal prints, folio boxes, and digital collections are available.";

  var CONTACT = {
    email: "mark@markandrewboudoir.com",
    phone: "(574) 622-5109",
    book: BOOKING_URL,
    booking_calendar: BOOKING_CALENDAR,
    location:
      "South Bend, Indiana — serving the Michiana region (Mishawaka, " +
      "Granger, Elkhart, Goshen IN; Niles, Edwardsburg, Berrien Springs MI).",
  };

  // --- Article / guide catalog (for search_articles) ------------------------
  var ARTICLES = [
    { title: "What is boudoir photography?", url: SITE + "/posts/what-is-boudoir-photography/", topic: "basics intro what is boudoir" },
    { title: "How to prepare for a boudoir session", url: SITE + "/posts/how-to-prepare-for-boudoir-session/", topic: "prep preparation get ready before" },
    { title: "How long does a boudoir photoshoot take?", url: SITE + "/posts/how-long-does-boudoir-photoshoot-take/", topic: "time length how long duration day" },
    { title: "Boudoir for plus-size women", url: SITE + "/posts/boudoir-for-plus-size-women/", topic: "plus size curvy body type sizes" },
    { title: "Bridal boudoir as a wedding gift", url: SITE + "/posts/bridal-boudoir-wedding-gift/", topic: "bridal wedding gift bride groom" },
    { title: "Couples boudoir: the perfect date", url: SITE + "/posts/couples-boudoir-perfect-date/", topic: "couples partner date together two" },
    { title: "Boudoir vs. glamour photography", url: SITE + "/posts/boudoir-vs-glamour-photography-difference/", topic: "glamour difference vs compare styles" },
    { title: "The same-day reveal difference", url: SITE + "/posts/same-day-reveal-mark-andrew-difference/", topic: "same day reveal gallery view editing" },
    { title: "Men's boudoir: why more men are booking", url: SITE + "/posts/mens-boudoir-why-more-men-booking/", topic: "mens male men dudoir guys" },
    { title: "Are boudoir photos a good idea? An honest answer", url: SITE + "/posts/are-boudoir-photos-a-good-idea/", topic: "worth it good idea should i nervous" },
    { title: "What is boudoir modeling? Do you have to be a model?", url: SITE + "/posts/what-is-boudoir-modeling/", topic: "modeling model experience needed" },
    { title: "How to choose a boudoir photographer in South Bend & Michiana", url: SITE + "/posts/how-to-choose-boudoir-photographer-south-bend/", topic: "choose pick photographer south bend michiana local" },
    { title: "Is boudoir awkward?", url: SITE + "/is-boudoir-awkward/", topic: "awkward nervous shy uncomfortable embarrassing" },
    { title: "What to wear to a boudoir session", url: SITE + "/what-to-wear-boudoir-session/", topic: "what to wear wardrobe outfit clothes" },
    { title: "Lingerie guide", url: SITE + "/lingerie-guide/", topic: "lingerie outfit flatter body type pieces" },
    { title: "Boudoir cost in South Bend", url: SITE + "/boudoir-photography-cost-south-bend/", topic: "cost price pricing how much investment" },
  ];

  // --- Helper: MCP-style text result ----------------------------------------
  function text(str) {
    return { content: [{ type: "text", text: str }] };
  }

  // --- Tool definitions -----------------------------------------------------
  var tools = [
    {
      name: "book_consultation",
      title: "Book a boudoir session",
      description:
        "Start booking a luxury boudoir photography session or free " +
        "consultation with Mark Andrew Boudoir (South Bend / Michiana). " +
        "Returns the live booking calendar link and scrolls to the on-page " +
        "booking calendar when available. It is $499 to reserve a date.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: function () {
        // If we're in a real page that has the booking section, scroll to it.
        try {
          var el = document.getElementById("book");
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth" });
          }
        } catch (e) {}
        return text(
          "To book, open the booking calendar and pick a date — it's $499 to " +
            "reserve your session.\n" +
            "Booking page: " + BOOKING_URL + "\n" +
            "Direct calendar: " + BOOKING_CALENDAR + "\n" +
            "Questions first? Email " + CONTACT.email + " or call " +
            CONTACT.phone + "."
        );
      },
    },
    {
      name: "get_pricing",
      title: "Pricing & investment",
      description:
        "Get how pricing and investment work at Mark Andrew Boudoir: the " +
        "booking retainer, typical image investment, payment plans, and " +
        "travel sessions.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return text(PRICING + "\n\nBook: " + BOOKING_URL);
      },
    },
    {
      name: "get_session_details",
      title: "What the session is like",
      description:
        "Get details about the Mark Andrew Boudoir experience: the full-day " +
        "session, hair & makeup, posing direction, same-day reveal, who it's " +
        "for, available products, and the photographic style.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return text(SESSION_DETAILS);
      },
    },
    {
      name: "search_articles",
      title: "Search the journal",
      description:
        "Search Mark Andrew Boudoir's journal articles and guides that answer " +
        "common boudoir questions (preparing, what to wear, cost, plus-size, " +
        "couples, men's, nerves, and more). Optionally filter by a keyword; " +
        "omit the keyword to list everything.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Optional keyword to filter by, e.g. 'cost', 'what to wear', " +
              "'nervous', 'plus size', 'couples'.",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var q = (input && input.query ? String(input.query) : "")
          .toLowerCase()
          .trim();
        var matches = ARTICLES.filter(function (a) {
          if (!q) return true;
          return (
            a.title.toLowerCase().indexOf(q) !== -1 ||
            a.topic.toLowerCase().indexOf(q) !== -1
          );
        });
        if (!matches.length) {
          return text(
            'No articles matched "' + q + '". Browse them all at ' +
              SITE + "/blog/"
          );
        }
        var lines = matches.map(function (a) {
          return "• " + a.title + " — " + a.url;
        });
        return text(
          (q ? 'Articles matching "' + q + '":\n' : "Articles:\n") +
            lines.join("\n")
        );
      },
    },
    {
      name: "get_contact_info",
      title: "Contact details",
      description:
        "Get Mark Andrew Boudoir's contact details: email, phone, booking " +
        "link, and the locations served.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return text(
          "Mark Andrew Boudoir\n" +
            "Email: " + CONTACT.email + "\n" +
            "Phone: " + CONTACT.phone + "\n" +
            "Book: " + CONTACT.book + "\n" +
            "Location: " + CONTACT.location
        );
      },
    },
  ];

  // --- Registration ---------------------------------------------------------
  function register(mc) {
    if (!mc) return false;
    try {
      if (typeof mc.provideContext === "function") {
        // Preferred: register the whole tool set in one call.
        mc.provideContext({ tools: tools });
        return true;
      }
      if (typeof mc.registerTool === "function") {
        // Fallback for builds that only expose per-tool registration.
        tools.forEach(function (t) {
          mc.registerTool(t);
        });
        return true;
      }
    } catch (e) {
      if (window.console && console.warn) {
        console.warn("[webmcp] tool registration failed:", e);
      }
    }
    return false;
  }

  // Prefer navigator.modelContext (Chrome EPP / proposal); fall back to
  // document.modelContext (current spec IDL).
  var container =
    (typeof navigator !== "undefined" && navigator.modelContext) ||
    (typeof document !== "undefined" && document.modelContext) ||
    null;

  register(container);

  // Expose for debugging / verification (and so other scripts can re-register).
  window.MarkAndrewWebMCP = { tools: tools, register: register };
})();
