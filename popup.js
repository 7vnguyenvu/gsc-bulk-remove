const $ = (id) => document.getElementById(id);
const delayInput = $("delay");
const exactUrlType = $("exact-url");
const prefixUrlType = $("prefix-url");
const startBtn = $("removeUrls");
const pauseBtn = $("pauseButton");
const resumeBtn = $("resumeButton");
const detailFocus = $("detailFocus");
pauseBtn.disabled = true;
resumeBtn.disabled = true;
pauseBtn.style.display = "none";
resumeBtn.style.display = "none";
let delayValue = 0.7;
let isPaused = false;
let currentIndex = 0;

delayInput.addEventListener("input", function (e) {
    let value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0.1) {
        e.target.value = 0.1;
    } else {
        delayValue = value;
    }
});

startBtn.addEventListener("click", async () => {
    $("done-url").innerText = 0;
    $("error-url").innerText = 0;
    const urlListTextarea = $("urlList");
    const uiTotal = $("total-url");

    const urls = urlListTextarea.value
        .trim()
        .split("\n")
        .filter((url) => url.trim() !== "");

    uiTotal.innerText = urls.length;

    if (urls.length > 0) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                console.error("No active tab found");
                return;
            }

            const activeTab = tabs[0];
            // Kiểm tra xem tab hiện tại có phải là trang Search Console không
            if (!activeTab.url.includes("search-console/removals?")) {
                detailFocus.innerText = "⚠️ This is not a Google Search Console - Removals page!";
                return;
            }

            // Reset the current index and paused state
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            pauseBtn.style.display = "inline-block";
            currentIndex = 0;
            isPaused = false;

            // Gọi hàm
            await removeUrls(urls, activeTab, prefixUrlType.checked);
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        detailFocus.innerText = "⚠️ Enter urls first!";
        console.error("No URLs provided");
    }
});

// Pause
pauseBtn.addEventListener("click", () => {
    isPaused = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "inline-block";
});

// Resume
resumeBtn.addEventListener("click", async () => {
    isPaused = false;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    pauseBtn.style.display = "inline-block";
    resumeBtn.style.display = "none";

    const urlListTextarea = document.getElementById("urlList");
    const urls = urlListTextarea.value
        .trim()
        .split("\n")
        .filter((url) => url.trim() !== "");

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    // Resume the removal process from where it left off
    await removeUrls(urls, activeTab);
});

async function removeUrls(urls, activeTab, prefixUrlType = false) {
    for (let i = currentIndex; i < urls.length; i++) {
        if (isPaused) {
            currentIndex = i; // Save the current index
            return; // Exit the function if paused
        }

        try {
            detailFocus.innerText = `👉 ${urls[i]}`;
            await removeUrl(urls[i], activeTab, prefixUrlType);
            i < urls.length - 1 && (await sleep(delayValue * 700));
        } catch (error) {
            console.error(`Error removing URL ${urls[i]}:`, error);
        }
    }
    await handleDone();
}

async function handleDone() {
    // Logic to handle completion of all URLs
    console.log("All URLs processed");
    // You can add UI updates or notifications here
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    pauseBtn.style.display = "none";
    resumeBtn.style.display = "none";
    detailFocus.innerHTML = `👌 Processing complete <i class="fa-solid fa-circle-check" style="color: #00ff00"></i>`;
}

/////////////////////////////////////////////////////////////////////////

async function removeUrl(url, activeTab, prefix) {
    const uiDone = document.getElementById("done-url");
    const uiError = document.getElementById("error-url");
    let numDone = Number(uiDone.innerText);
    let numErr = Number(uiError.innerText);

    try {
        await clickButton("NEW REQUEST", activeTab); // Mở form xóa URL mới
        await waitForm('div[aria-label="New Request"]', activeTab); // Đợi form hiển thị
        // await clickElement('span:contains("Temporarily remove URL")'); // Chọn loại xóa (tạm thời)
        await fillInput('input[placeholder="Enter URL"]', url, activeTab); // Nhập URL
        if (prefix) {
            await clickTypePrefix('div[data-value="yNQTT"]', activeTab); // Select type prefix
        }
        await clickButton("NEXT", activeTab); // Nhấn nút Next
        await waitForm("div.Ka0n7d[aria-labelledby]", activeTab); // Đợi form xác nhận hiển thị
        await clickButton("SUBMIT REQUEST", activeTab); // Xác nhận xóa

        // Kiểm tra song song cả thông báo thành công và trùng lặp
        const result = await Promise.race([
            waitForm("div.VcC8Fc", activeTab)
                .then(() => "success")
                .catch(() => null), // Thông báo thành công
            waitForm("div.EwFnZe[aria-labelledby]", activeTab)
                .then(() => "duplicate")
                .catch(() => null), // Thông báo trùng lặp
        ]);

        // Xử lý kết quả ngay khi một trong hai hoàn tất
        if (result === "duplicate") {
            uiError.innerText = numErr + 1;
            console.error(`Duplicate request for URL: ${url}`);
            await clickButton("CLOSE", activeTab);
        } else if (result === "success") {
            console.log(`Successfully requested removal for URL: ${url}`);
            uiDone.innerText = numDone + 1;
        } else {
            console.error(`Unexpected error or timeout for URL: ${url}`);
            uiError.innerText = numErr + 1;
        }

        const success = await waitForm("div.VcC8Fc", activeTab).catch(() => false);

        // Đợi thông báo xử lý hoàn tất hoặc có thông báo lỗi
        const duplicate = !success[0].result ? await waitForm("div.EwFnZe[aria-labelledby]", activeTab).catch(() => false) : null;
        if (duplicate[0].result === true) {
            uiError.innerText = numErr + 1;
            console.error(`Duplicate request for URL: ${url}`);
            await clickButton("CLOSE", activeTab);
        } else {
            console.log(`Successfully requested removal for URL: ${url}`);
            uiDone.innerText = numDone + 1;
        }
    } catch (error) {
        console.error(`Failed to remove URL ${url}:`, error);
        throw error;
    }
}

async function clickButton(text, activeTab) {
    return await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (text) => {
            const element = Array.from(document.querySelectorAll('div[role="button"]')).find((el) => el.innerText.includes(text));
            if (element) {
                element.click();
                return true; // Trả về true nếu click thành công
            } else {
                console.error(`Element with text "${text}" not found.`);
                return false; // Trả về false nếu không tìm thấy
            }
        },
        args: [text],
    });
}
async function clickTypePrefix(selector, activeTab) {
    return await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (selector) => {
            const element = document.querySelector(selector);
            console.log(element);
            if (element) {
                element.click();
                return true; // Trả về true nếu click thành công
            } else {
                console.error(`Element with selector "${selector}" not found.`);
                return false; // Trả về false nếu không tìm thấy
            }
        },
        args: [selector],
    });
}

async function fillInput(selector, value, activeTab) {
    await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (selector, value) => {
            const input = document.querySelector(selector); // Tìm input trong ngữ cảnh của tab
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
            } else {
                console.error(`Element not found for selector: ${selector}`);
            }
        },
        args: [selector, value], // Truyền các tham số cần thiết
    });
}

async function waitForm(selector, activeTab, timeout = 700) {
    return await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (selector, timeout) => {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const intervalId = setInterval(() => {
                    const element = document.querySelector(selector);
                    if (element) {
                        clearInterval(intervalId);
                        resolve(true);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(intervalId);
                        reject(new Error(`Timeout waiting for element: ${selector}`));
                    }
                }, timeout);
            });
        },
        args: [selector, timeout],
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
