/* Entirely fictional, AI-created UI fixtures, including PR titles. Neither side is a human baseline. */
(function (root) {
  "use strict";
  const fixtures = [
    { id: "DEMO-01", title: "Remember the selected export folder",
      issue: "After exporting a file to a chosen folder, the next export dialog opens in the default folder again. Reuse the last folder while it remains available.",
      patches: [
        { filename: "src/main/java/demo/export/ExportController.java", text: "- folder = preferences.defaultExportFolder();\n+ folder = preferences.lastExportFolder();\n+ if (!folder.exists()) folder = preferences.defaultExportFolder();\n  exportTo(folder);\n+ preferences.setLastExportFolder(folder);" },
        { filename: "src/main/java/demo/preferences/ExportPreferences.java", text: "+ public File lastExportFolder() {\n+     return new File(store.get(\"lastExportFolder\", defaultExportFolder().getPath()));\n+ }\n+ public void setLastExportFolder(File folder) {\n+     store.put(\"lastExportFolder\", folder.getPath());\n+ }" }
      ],
      descriptions: [
        { id: "DEMO-01-u", blocks: [["h3", "Keep the last export location"], ["p", "Repeated exports were opening in the default folder, even after choosing another destination. Remember the most recent export folder and fall back to the default if it no longer exists."], ["h4", "Check"], ["p", "Export twice, then remove the saved folder and try again."]] },
        { id: "DEMO-01-v", blocks: [["h3", "Update export folder preferences"], ["p", "This change reads the last export folder before starting an export and stores the selected folder afterward."], ["h4", "Changes"], ["ul", ["Read lastExportFolder from preferences.", "Check that the folder exists.", "Use the default folder as a fallback.", "Save the folder after exportTo returns."]]] }
      ] },
    { id: "DEMO-02", title: "Make the search filter case-insensitive",
      issue: "Searching for a lowercase author name does not find entries using capital letters. The filter should ignore capitalization without changing the stored names.",
      patches: [{ filename: "src/main/java/demo/search/NameFilter.java", text: "- return name.contains(query);\n+ return name.toLowerCase(Locale.ROOT)\n+     .contains(query.toLowerCase(Locale.ROOT));" }],
      descriptions: [
        { id: "DEMO-02-u", blocks: [["h3", "Normalize strings for matching"], ["p", "Convert the name and query to lowercase with a fixed locale before the contains check. This changes only the comparison; the original entry text is not modified."], ["p", "The patch does not add tests."]] },
        { id: "DEMO-02-v", blocks: [["h3", "Find names regardless of capitalization"], ["p", "Users had to reproduce the capitalization of an author's name to find an entry. The search now ignores case. Please check mixed-case names and a query that has no match."]] }
      ] },
    { id: "DEMO-03", title: "Handle an empty preview selection",
      issue: "Closing the current collection leaves the preview handler with no selected entry. The last preview can remain on screen or the renderer can receive a null entry.",
      patches: [{ filename: "src/main/java/demo/preview/PreviewController.java", text: "+ if (selectedEntry == null) {\n+     preview.clear();\n+     return;\n+ }\n  preview.render(selectedEntry);" }],
      descriptions: [
        { id: "DEMO-03-u", blocks: [["h3", "Clear preview when the selection is empty"], ["p", "Return before rendering if there is no selected entry, and clear the existing preview. A selected entry still follows the existing render path."]] },
        { id: "DEMO-03-v", blocks: [["h3", "Avoid rendering an absent selection"], ["p", "When the selection becomes empty, clear the panel instead of passing an absent entry to the renderer. Normal selections are unaffected by the new guard."]] }
      ] },
    { id: "DEMO-04", title: "Change a download retry limit",
      issue: "Some remote downloads fail intermittently. Investigate retry handling. No failure rate, server constraints, or retry rationale is included in this fictional report.",
      patches: [{ filename: "src/main/java/demo/download/DownloadService.java", text: "- private static final int MAX_RETRIES = 2;\n+ private static final int MAX_RETRIES = 4;" }],
      descriptions: [
        { id: "DEMO-04-u", blocks: [["h3", "Allow more download retries"], ["p", "Increase the retry limit from two to four. This gives intermittent failures additional attempts before returning an error. The timeout and delay settings are unchanged."]] },
        { id: "DEMO-04-v", blocks: [["h3", "Adjust the retry constant"], ["p", "Set MAX_RETRIES to four. This patch changes the retry count only; it does not change the delay, timeout, or error reporting."]] }
      ] },
    { id: "DEMO-05", title: "Reject blank collection names",
      issue: "Blank-looking names make collections difficult to distinguish in the sidebar. Reject empty or whitespace-only names and show a message before creating the collection.",
      patches: [{ filename: "src/main/java/demo/collection/CollectionController.java", text: "+ if (name.trim().isEmpty()) {\n+     showError(\"Enter a collection name\");\n+     return;\n+ }\n  createCollection(name);" }],
      descriptions: [
        { id: "DEMO-05-u", blocks: [["h3", "Validate a collection name before creation"], ["h4", "Behavior"], ["ul", ["Trim the proposed name for the blank check.", "Show a message and return for an empty result.", "Otherwise pass the original name to createCollection."]], ["h4", "Validation"], ["p", "Try an empty name, a spaces-only name, and a name with surrounding spaces. This description lists checks to perform, not results from a completed test run."]] },
        { id: "DEMO-05-v", blocks: [["h3", "Prevent blank entries in the collection list"], ["p", "Spaces-only names produced indistinguishable blank rows in the sidebar. Stop collection creation and ask for a name when the input is blank. Nonblank names keep their existing handling."]] }
      ] }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = fixtures;
  else root.PreferenceFixtures = fixtures;
})(typeof globalThis !== "undefined" ? globalThis : this);
