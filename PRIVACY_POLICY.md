# Privacy Policy for Mouse Gesture Pilot

**Last Updated:** November 1, 2025  
**Extension Version:** 1.1.1  
**Developer:** zhangsongai3@gmail.com

---

## Summary

**Mouse Gesture Pilot does NOT collect, store, or transmit any personal data to external servers.**

All data stays on your device. No tracking. No analytics. No external servers.

---

## 1. Data Collection

**We do NOT collect any personal data.**

This extension does not:
- ❌ Collect browsing history
- ❌ Track user behavior
- ❌ Access website content
- ❌ Read form data or passwords
- ❌ Transmit any data to external servers
- ❌ Use analytics or tracking services
- ❌ Display advertisements

---

## 2. Local Storage

The extension stores the following data **locally on your device only** using Chrome's secure storage API:

### What We Store Locally:
- **Custom gesture patterns** you create (gesture direction + assigned action)
- **Sensitivity settings** (gesture recognition threshold)
- **Trail duration settings** (visual feedback timing)
- **Enable/disable states** for individual gestures and the extension
- **Language preferences**

### Where It's Stored:
- All data is stored using `chrome.storage.local`
- Data never leaves your device
- No synchronization to external servers
- No cloud storage

---

## 3. Permissions Usage

The extension requests the following permissions. Here's exactly how we use them:

### storage
**Purpose:** Save your custom gestures and preferences locally  
**What we store:** Only user settings and custom gestures  
**Where:** Local browser storage only  
**Never:** Transmitted to any server

### tabs
**Purpose:** Execute tab actions (open, close, switch, duplicate) triggered by gestures  
**What we access:** Tab IDs and basic tab information  
**What we don't access:** Tab content, URLs, or browsing history  
**Never:** Tracked or stored

### activeTab
**Purpose:** Detect mouse gestures on the current page  
**What we monitor:** Mouse events (mousedown, mousemove, mouseup) only when you actively perform a gesture  
**What we don't access:** Page content, forms, passwords, or any website data  
**Never:** Read or collect page content

### sessions
**Purpose:** Restore recently closed tabs (reopen gesture feature)  
**What we access:** Chrome's recently closed tabs list  
**What we don't track:** Your browsing history or session data  
**Never:** Stored or transmitted

### sidePanel
**Purpose:** Display the gesture reference panel  
**What it shows:** List of available gestures and settings  
**What it doesn't do:** Access any external data  
**Never:** Communicates with external servers

### host_permissions (*://*/*)
**Purpose:** Enable gesture detection on all websites  
**Why needed:** For consistent gesture functionality across all sites  
**What we access:** Mouse events only (when you perform a gesture)  
**What we don't access:** Website content, forms, cookies, or sensitive data  
**Never:** Read, modify, or transmit page content

---

## 4. What We Don't Do

### ❌ No Data Collection
We do not collect any personal information, browsing data, or usage statistics.

### ❌ No Tracking
We do not track your browsing behavior, visited websites, or online activities.

### ❌ No External Servers
We do not operate any servers or cloud services. All processing happens locally in your browser.

### ❌ No Third-Party Services
We do not use:
- Analytics services (no Google Analytics, etc.)
- Advertising networks
- Social media integrations
- External APIs
- Telemetry or crash reporting

### ❌ No Network Requests
The extension does not make any network requests to external servers.

### ❌ No Cookies
We do not set, read, or access any cookies.

---

## 5. Data Security

- **Local Storage:** All data uses Chrome's secure storage API
- **No Transmission:** Data never leaves your device
- **No Encryption Needed:** Since no data is transmitted, encryption for transit is unnecessary
- **User Control:** You can delete all data by uninstalling the extension

---

## 6. Third-Party Access

**No third parties have access to any data.**

The only external dependency is the NES.css UI library, which is:
- Bundled with the extension
- Loaded locally (no CDN)
- Pure CSS (no JavaScript tracking)
- Open source

---

## 7. Children's Privacy

This extension does not knowingly collect any information from children under 13 years of age. Since we don't collect any data at all, it's safe for all ages.

---

## 8. Your Rights

You have complete control over your data:

### View Your Data
You can view your custom gestures and settings in the extension's options page.

### Export Your Data
Currently not available, but you can manually record your gesture configurations.

### Delete Your Data
**Option 1:** Uninstall the extension (removes all data)  
**Option 2:** Use Chrome's "Clear browsing data" and select "Extension data"  
**Option 3:** Click "Reset Settings" in the extension's options page

### Opt-Out
Simply disable or uninstall the extension.

---

## 9. Changes to Privacy Policy

We may update this privacy policy occasionally. Changes will be:
- Reflected in the extension's update notes
- Published with a new "Last Updated" date
- Available at this URL

Continued use after changes constitutes acceptance of the updated policy.

---

## 10. Compliance

This extension complies with:
- ✅ **Chrome Web Store Developer Program Policies**
- ✅ **General Data Protection Regulation (GDPR)** principles
- ✅ **California Consumer Privacy Act (CCPA)** guidelines
- ✅ **Manifest V3** standards

---

## 11. Transparency

This extension is **open source**. You can:
- Review the complete source code
- Verify our privacy practices
- Audit the code yourself
- Report issues or concerns

**GitHub Repository:** https://github.com/zhangsong-github/mouse-guesture-crx

---

## 12. Contact Information

If you have questions or concerns about this privacy policy:

- **Email:** zhangsongai3@gmail.com
- **GitHub Issues:** https://github.com/zhangsong-github/mouse-guesture-crx/issues

We typically respond within 24-48 hours.

---

## 13. Consent

By installing and using Mouse Gesture Pilot, you consent to this privacy policy.

You can withdraw consent at any time by uninstalling the extension.

---

## Privacy Policy in Brief

| Question | Answer |
|----------|--------|
| Do you collect data? | ❌ No |
| Do you use analytics? | ❌ No |
| Do you track users? | ❌ No |
| Do you use external servers? | ❌ No |
| Do you share data with third parties? | ❌ No |
| Where is my data stored? | ✅ Locally on your device only |
| Can I delete my data? | ✅ Yes, uninstall the extension |
| Is the code open source? | ✅ Yes, fully auditable |

---

**In Summary:**  
Mouse Gesture Pilot is designed with privacy as a core principle. We don't collect, track, or transmit any data. Everything stays on your device. Period.

---

**Extension:** Mouse Gesture Pilot  
**Version:** 1.1.1  
**Developer:** zhangsongai3@gmail.com  
**License:** MIT  
**Last Updated:** November 1, 2025
