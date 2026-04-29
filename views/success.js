/**
 * views/success.js: The "Poll Created" success view logic.
 */

export async function renderSuccessView(container, pollId, editToken, isEdit = false) {
    const origin = window.location.origin;
    const participantUrl = `${origin}?id=${pollId}`;
    const editUrl = editToken ? `${origin}?id=${pollId}&admin=${editToken}` : null;

    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div class="poll-header-row">
                    <div>
                        <h2 class="poll-title poll-title-compact">${isEdit ? 'Poll Edited' : 'Poll Created'}</h2>
                        <p class="poll-description-muted">${isEdit ? 'Your changes have been saved.' : `Your poll is live. Share it with your group to start collecting responses. <br/> <br/> Securely store your <a href="${editUrl}" target="_blank">private edit link</a> to edit the poll in the future.`}</p>
                    </div>
                </div>
            </header>
            
            <section class="success-link-section">
                <label class="success-link-label">Participant Link</label>
                <div class="success-link-row">
                    <div class="input-with-button success-link-display">
                        <input type="text" id="poll-url-display" value="${participantUrl}" readonly>
                        <button type="button" id="copy-poll-btn" class="embedded-icon-btn" title="Copy Participant Link">📋</button>
                    </div>
                    <a href="${participantUrl}" class="button primary success-view-poll-btn margin-0">
                        <span>View Poll</span>
                        <span class="chevron-right">›</span>
                    </a>
                </div>
                <p class="instruction-text hint-text">Anyone with this link can view your poll and add their response.</p>
                
                <div id="notifications-group" style="display: none; margin-top: 2rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="enable-notifications" name="enable-notifications">
                        Get notified when people respond
                    </label>
                </div>
            </section>
        </article>
    `;

    /**
     * Clipboard API Utility with Tippy Feedback on the Buttons.
     */
    const setupCopy = (btnId, textToCopy) => {
        const btn = container.querySelector(`#${btnId}`);
        if (!btn) return;

        if (window.tippy) {
            window.tippy(btn, {
                content: 'Copied!',
                trigger: 'manual',
                placement: 'top',
                appendTo: btn.parentNode,
                onShow(instance) {
                    setTimeout(() => instance.hide(), 2000);
                }
            });
        }

        btn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(textToCopy);
                if (btn._tippy) btn._tippy.show();
            } catch (err) {
                console.error('Failed to copy', err);
            }
        };
    };

    setupCopy('copy-poll-btn', participantUrl);
    if (editUrl) setupCopy('copy-edit-btn', editUrl);

    // --- Web Push Logic ---
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    const notificationsGroup = container.querySelector('#notifications-group');
    const enableNotifications = container.querySelector('#enable-notifications');

    if (isPushSupported && !isEdit) {
        notificationsGroup.style.display = 'block';

        // Check if already subscribed for this browser
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        // We are already subscribed on this browser, but we don't know if this poll is linked.
                        // Let's assume if they have a sub, we can show it checked, or leave unchecked so they can click to explicitly link it.
                        // Leaving unchecked is safer so they actively choose to receive notifications for this poll.
                    }
                });
            }
        });

        enableNotifications.addEventListener('change', async (e) => {
            if (e.target.checked) {
                const originalText = e.target.nextSibling.textContent;
                e.target.nextSibling.textContent = ' Enabling...';

                try {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        throw new Error('Permission denied');
                    }

                    const registration = await navigator.serviceWorker.register('/sw.js');
                    await navigator.serviceWorker.ready;

                    // Fetch VAPID public key
                    const keyRes = await fetch('/api/push/public-key');
                    const { key } = await keyRes.json();

                    if (!key) throw new Error('VAPID public key missing');

                    // Convert base64 to Uint8Array
                    const padding = '='.repeat((4 - key.length % 4) % 4);
                    const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(base64);
                    const applicationServerKey = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                        applicationServerKey[i] = rawData.charCodeAt(i);
                    }

                    let subscription;
                    try {
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey
                        });
                    } catch (subErr) {
                        if (subErr.name === 'InvalidStateError') {
                            console.warn('VAPID key changed. Unsubscribing from old key...');
                            const oldSub = await registration.pushManager.getSubscription();
                            if (oldSub) {
                                await oldSub.unsubscribe();
                            }
                            // Retry subscription
                            subscription = await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey
                            });
                        } else {
                            throw subErr;
                        }
                    }

                    // Send subscription to backend
                    const res = await fetch('/api/push/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            poll_id: pollId,
                            subscription: subscription.toJSON()
                        })
                    });

                    if (!res.ok) throw new Error('Failed to save subscription on server');

                    e.target.nextSibling.textContent = ' Notifications enabled';
                } catch (err) {
                    console.error('Push subscription failed:', err);
                    e.target.checked = false;
                    e.target.nextSibling.textContent = originalText;
                    window.showToast("Failed to enable notifications. " + (err.message || ''));
                }
            } else {
                const originalText = e.target.nextSibling.textContent;
                e.target.nextSibling.textContent = ' Disabling...';

                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        const res = await fetch('/api/push/unsubscribe', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                poll_id: pollId,
                                endpoint: subscription.endpoint
                            })
                        });
                        if (!res.ok) throw new Error('Failed to remove subscription on server');
                    }
                    e.target.nextSibling.textContent = ' Get notified when people respond';
                } catch (err) {
                    console.error('Push unsubscription failed:', err);
                    e.target.checked = true; // Re-check if failed
                    e.target.nextSibling.textContent = originalText;
                    window.showToast("Failed to disable notifications.");
                }
            }
        });
    }
}
