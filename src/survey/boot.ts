/** localStorage value: `dismissed` hides the home banner, `answered` hides the banner and the form. */
export const SURVEY_STORAGE_KEY = "ap_survey";

/**
 * Readable cookie set when a response is stored. The head script reads it on the
 * redirect that follows a submit, before paint, so the form does not flash.
 * Lifetime matches the anonymous visitor cookie.
 */
export const SURVEY_DONE_COOKIE = "ap_survey_done";

/**
 * Runs in <head> on a full load. Hides the banner before paint, and delegates 닫기
 * on document so the listener still works after a client-side navigation mounts the card.
 */
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
    document.addEventListener("click", function (event) {
      var node = event.target;
      if (node && node.nodeType === 3) node = node.parentElement;
      if (!node || !node.closest || !node.closest("[data-survey-dismiss]")) return;
      try {
        if (localStorage.getItem(key) !== "answered") localStorage.setItem(key, "dismissed");
      } catch (e) {}
      document.documentElement.setAttribute("data-survey-banner", "off");
    });
  } catch (e) {}
})();`;
