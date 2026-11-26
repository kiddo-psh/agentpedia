/** localStorage value: `dismissed` hides the home banner, `answered` hides the banner and the form. */
export const SURVEY_STORAGE_KEY = "ap_survey";

/**
 * Readable cookie set when a response is stored. The head script reads it on the
 * redirect that follows a submit, before paint, so the form does not flash.
 * Lifetime matches the anonymous visitor cookie.
 */
export const SURVEY_DONE_COOKIE = "ap_survey_done";

/** Runs in <head>. Sets html attributes from localStorage and the done cookie. No fetch. */
export const SURVEY_BOOT_JS = `(function () {
  try {
    var key = ${JSON.stringify(SURVEY_STORAGE_KEY)};
    var v = null;
    try { v = localStorage.getItem(key); } catch (e) {}
    var done = new RegExp("(?:^|; )" + ${JSON.stringify(SURVEY_DONE_COOKIE)} + "=1(?:;|$)").test(document.cookie);
    var answered = v === "answered" || done;
    if (v === "dismissed" || answered) document.documentElement.setAttribute("data-survey-banner", "off");
    if (answered) {
      document.documentElement.setAttribute("data-survey", "answered");
      try { localStorage.setItem(key, "answered"); } catch (e) {}
    }
  } catch (e) {}
})();`;

/** Binds the dismiss control that sits immediately before this script. */
export const SURVEY_DISMISS_JS = `(function () {
  var root = document.currentScript && document.currentScript.previousElementSibling;
  var btn = root && root.querySelector("[data-survey-dismiss]");
  if (!btn) return;
  btn.addEventListener("click", function () {
    try {
      var key = ${JSON.stringify(SURVEY_STORAGE_KEY)};
      if (localStorage.getItem(key) !== "answered") localStorage.setItem(key, "dismissed");
    } catch (e) {}
    document.documentElement.setAttribute("data-survey-banner", "off");
  });
})();`;
