const $ = (e) => document.getElementById(e),
    delayInput = $("delay"),
    exactUrlType = $("exact-url"),
    prefixUrlType = $("prefix-url"),
    startBtn = $("removeUrls"),
    pauseBtn = $("pauseButton"),
    resumeBtn = $("resumeButton"),
    detailFocus = $("detailFocus");
(pauseBtn.disabled = !0), (resumeBtn.disabled = !0), (pauseBtn.style.display = "none"), (resumeBtn.style.display = "none");
let delayValue = 0.7,
    isPaused = !1,
    currentIndex = 0;
async function removeUrls(e, t, r = !1) {
    for (let n = currentIndex; n < e.length; n++) {
        if (isPaused) return void (currentIndex = n);
        try {
            (detailFocus.innerText = `👉 ${e[n]}`), await removeUrl(e[n], t, r), n < e.length - 1 && (await sleep(700 * delayValue));
        } catch (t) {
            console.error(`Error removing URL ${e[n]}:`, t);
        }
    }
    await handleDone();
}
async function handleDone() {
    console.log("All URLs processed"),
        (startBtn.disabled = !1),
        (pauseBtn.disabled = !0),
        (resumeBtn.disabled = !0),
        (pauseBtn.style.display = "none"),
        (resumeBtn.style.display = "none"),
        (detailFocus.innerHTML = '👌 Processing complete <i class="fa-solid fa-circle-check" style="color: #00ff00"></i>');
}
async function removeUrl(e, t, r) {
    const n = document.getElementById("done-url"),
        a = document.getElementById("error-url");
    let i = Number(n.innerText),
        l = Number(a.innerText);
    try {
        await click('div[role="button"].ZGldwb', t),
            await waitForm('div[aria-label="New Request"]', t),
            await fillInput("input.VfPpkd-fmcmS-wGMbrd ", e, t),
            r && (await clickTypePrefix('div[data-value="yNQTT"]', t)),
            await click('div[role="button"].tWntE', t),
            await waitForm("div.Ka0n7d[aria-labelledby]", t),
            await click('div[role="button"][data-id="EBS5u"]', t);
        const o = await Promise.race([
            waitForm("div.VcC8Fc", t)
                .then(() => "success")
                .catch(() => null),
            waitForm("div.EwFnZe[aria-labelledby]", t)
                .then(() => "duplicate")
                .catch(() => null),
        ]);
        "duplicate" === o
            ? ((a.innerText = l + 1), console.error(`Duplicate request for URL: ${e}`), await click('div[role="button"][data-id="EBS5u"]', t))
            : "success" === o
            ? (console.log(`Successfully requested removal for URL: ${e}`), (n.innerText = i + 1))
            : (console.error(`Unexpected error or timeout for URL: ${e}`), (a.innerText = l + 1));
        const c = await waitForm("div.VcC8Fc", t).catch(() => !1);
        !0 === (c[0].result ? null : await waitForm("div.EwFnZe[aria-labelledby]", t).catch(() => !1))[0].result
            ? ((a.innerText = l + 1), console.error(`Duplicate request for URL: ${e}`), await click('div[role="button"][data-id="EBS5u"]', t))
            : (console.log(`Successfully requested removal for URL: ${e}`), (n.innerText = i + 1));
    } catch (t) {
        throw (console.error(`Failed to remove URL ${e}:`, t), t);
    }
}
async function click(e, t) {
    return await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: (e) => {
            const t = document.querySelector(e);
            return t ? (t.click(), !0) : (console.error(`Element with text "${text}" not found.`), !1);
        },
        args: [e],
    });
}
async function clickButton(e, t) {
    return await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: (e) => {
            const t = Array.from(document.querySelectorAll('div[role="button"]')).find((t) => t.innerText.includes(e));
            return t ? (t.click(), !0) : (console.error(`Element with text "${e}" not found.`), !1);
        },
        args: [e],
    });
}
async function clickTypePrefix(e, t) {
    return await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: (e) => {
            const t = document.querySelector(e);
            return console.log(t), t ? (t.click(), !0) : (console.error(`Element with selector "${e}" not found.`), !1);
        },
        args: [e],
    });
}
async function fillInput(e, t, r) {
    await chrome.scripting.executeScript({
        target: { tabId: r.id },
        func: (e, t) => {
            const r = document.querySelector(e);
            r ? ((r.value = t), r.dispatchEvent(new Event("input", { bubbles: !0 }))) : console.error(`Element not found for selector: ${e}`);
        },
        args: [e, t],
    });
}
async function waitForm(e, t, r = 700) {
    return await chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: (e, t) =>
            new Promise((r, n) => {
                const a = Date.now(),
                    i = setInterval(() => {
                        document.querySelector(e)
                            ? (clearInterval(i), r(!0))
                            : Date.now() - a > t && (clearInterval(i), n(new Error(`Timeout waiting for element: ${e}`)));
                    }, t);
            }),
        args: [e, r],
    });
}
function sleep(e) {
    return new Promise((t) => setTimeout(t, e));
}
delayInput.addEventListener("input", function (e) {
    let t = parseFloat(e.target.value);
    isNaN(t) || t < 0.1 ? (e.target.value = 0.1) : (delayValue = t);
}),
    startBtn.addEventListener("click", async () => {
        ($("done-url").innerText = 0), ($("error-url").innerText = 0);
        const e = $("urlList"),
            t = $("total-url"),
            r = e.value
                .trim()
                .split("\n")
                .filter((e) => "" !== e.trim());
        if (((t.innerText = r.length), r.length > 0))
            try {
                const e = await chrome.tabs.query({ active: !0, currentWindow: !0 });
                if (0 === e.length) return void console.error("No active tab found");
                const t = e[0];
                if (!t.url.includes("search-console/removals?"))
                    return void (detailFocus.innerText = "⚠️ This is not a Google Search Console - Removals page!");
                (startBtn.disabled = !0),
                    (pauseBtn.disabled = !1),
                    (pauseBtn.style.display = "inline-block"),
                    (currentIndex = 0),
                    (isPaused = !1),
                    await removeUrls(r, t, prefixUrlType.checked);
            } catch (e) {
                console.error("Error:", e);
            }
        else (detailFocus.innerText = "⚠️ Enter urls first!"), console.error("No URLs provided");
    }),
    pauseBtn.addEventListener("click", () => {
        (isPaused = !0),
            (pauseBtn.disabled = !0),
            (resumeBtn.disabled = !1),
            (pauseBtn.style.display = "none"),
            (resumeBtn.style.display = "inline-block");
    }),
    resumeBtn.addEventListener("click", async () => {
        (isPaused = !1),
            (pauseBtn.disabled = !1),
            (resumeBtn.disabled = !0),
            (pauseBtn.style.display = "inline-block"),
            (resumeBtn.style.display = "none");
        const e = document
                .getElementById("urlList")
                .value.trim()
                .split("\n")
                .filter((e) => "" !== e.trim()),
            t = (await chrome.tabs.query({ active: !0, currentWindow: !0 }))[0];
        await removeUrls(e, t);
    });
