# Privacy Policy

Effective date: July 12, 2026

Oh My Hattrick is a browser extension that improves the display of Hattrick
player pages, lets you add local player tags, and can export the visible player
data to CSV or copy it as JSON.

## Data Collection

Oh My Hattrick does not collect, sell, share, or transmit personal data.
Optional player tags are stored locally in your browser by the extension.

The extension runs only on matching Hattrick player pages and reads the content
already visible in your browser tab so it can build a compact local view. When
you use the export or copy features, the output is generated locally in your
browser.

## Data Transmission

Oh My Hattrick does not send any data to the developer, to external servers, or
to third-party services.

The extension does not use analytics, tracking pixels, advertising SDKs, remote
logging, or telemetry.

## Permissions

Oh My Hattrick uses a content script on Hattrick player pages under:

`https://*.hattrick.org/Club/Players*`

This access is used only to read and reorganize player information already shown
on those pages and to provide local export, copy, and tagging features.

## Local Storage

Oh My Hattrick uses Chrome extension local storage only to remember optional
player tags that you assign in the extension. These tags are stored locally under
the extension key `ohMyHattrick.playerTags.v1`.

The extension does not use cookies, IndexedDB, or sync storage. Locally stored
tags are not transmitted to the developer, to Hattrick, or to third-party
services by this extension.

If you used an older version that stored tags in Hattrick page localStorage, the
extension may migrate those tags locally into extension storage and remove the
old localStorage entry.

## Third Parties

Oh My Hattrick does not integrate with third-party services and does not share
data with third parties.

## Changes

This privacy policy may be updated if the extension's behavior changes. Any
material change to data handling will be reflected in this document.

## Contact

For questions about this privacy policy, please contact the project maintainer
through the GitHub repository:

https://github.com/plucury/ohmyhattrick
