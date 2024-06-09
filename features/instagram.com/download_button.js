let downloadButtonElement = $(`
<span id="RTBDownloadButton">
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
        <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</span>
`);
downloadButtonElement.css({
	"margin-left": "0.4rem",
	cursor: "pointer",
});

// post
const XPathPost = "/html/body/div[*]/div/div/div[2]/div/div/div[1]/div[1]/div[2]/section/main/div/div[1]/div"; // gets the post
/// modal
const XPathModal = "/html/body/div[*]/div[1]/div/div[3]/div/div/div/div/div[2]/div/article/div"; // gets the post of the modal
// homepage
const XPathHomepage = "/html/body/div[2]/div/div/div[2]/div/div/div[1]/div[1]/div[2]/section/main/div[1]/div[1]/div/div[3]/div/div[1]/div"; // gets the div containing all posts on instagram homepage

// setInterval to keep checking for posts
let repeater;

let modalExists = false;
function ApplyDownloadToModal() {
	if (!modalExists && checkIfXPathExists(XPathModal)) {
		// check if there is a modal and it has not been registered previously (to avoid having multiple download buttons)
		modalExists = true;

		const post = $(getElemByXPath(XPathModal));
		const buttonsSection = post.find(
			"section.x78zum5.x1q0g3np.xwib8y2.x1yrsyyn.x1xp8e9x.x13fuv20.x178xt8z.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xo1ph6p.x1pi30zi.x1swvt13"
		);

		const newDownloadButtonElement = downloadButtonElement.clone(false);
		newDownloadButtonElement.css("padding", "8px");
		newDownloadButtonElement.on("click", () => {
			startPostDownload(post);
		});

		buttonsSection.append(newDownloadButtonElement);
	} else if (modalExists && !checkIfXPathExists(XPathModal)) {
		modalExists = false;
	}
}

function applyDownloadToHomepage() {
	const homepageElem = $(getElemByXPath(XPathHomepage));

	homepageElem.children().each((_, elem) => {
		elem = $(elem);
		if (elem.has("#RTBDownloadButton").length) return;

		// make copy of download button
		const newDownloadButtonElement = downloadButtonElement.clone(false);

		newDownloadButtonElement.on("click", async () => {
			startPostDownload(elem);
		});

		elem.find("div > div.x1lliihq.x1n2onr6 > div > div > section.x6s0dn4.xrvj5dj.x1o61qjw.x12nagc.x1gslohp")
			.css("grid-template-columns", "1fr 1fr auto")
			.append(newDownloadButtonElement);
	});
}

function applyDownloadToPost() {
	// avoid running this code on the homepage due to the XPath being valid where it shouldnt be.
	if (/^.*(instagram.com)(\/)?$/g.test(window.location.href)) return;

	waitForXPathElem(XPathPost).then((elem) => {
		// clear interval since its not needed on this page
		clearInterval(repeater);

		const post = $(elem);
		const buttonsSection = post.find("section.x6s0dn4.xrvj5dj.x1o61qjw");
		buttonsSection.css("grid-template-columns", "1fr 1fr auto");

		downloadButtonElement.on("click", () => {
			startPostDownload(post);
		});

		buttonsSection.append(downloadButtonElement);
	});
}

// download button
async function Instagram_EnableDownloadButton() {
	// post
	applyDownloadToPost();

	repeater = setInterval(() => {
		ApplyDownloadToModal();
		applyDownloadToHomepage();
	}, 200);
}

function Instagram_DisableDownloadButton() {
	$("#RTBDownloadButton").remove();
	clearInterval(repeater);
}

// Register feature in a central registry
chrome.runtime.sendMessage({
	action: "registerFeatures",
	website: "www.instagram.com",
	features: [
		{
			name: "Download Button",
			enable: "Instagram_EnableDownloadButton",
			disable: "Instagram_DisableDownloadButton",
		},
	],
});

// +===========================================+
// |            useful functions               |
// +===========================================+
async function startPostDownload(post) {
	console.log("[DOWNLOADER] :: Starting download process");

	// get data related to the post
	const { postId, postIndex, postUrl, isCarousel } = getPostData(post);
	// get media related data from the post
	const { mediaUrls, carouselMediaIds } = await getPostMedia("https://www.instagram.com" + postUrl, isCarousel);
	/*
    mediaUrls structure:
    [ string ],
    [{
        id: string,
        contentUrl: string
    }]
    */

	let mediaUrl;

	// if its a carousel get the media url related to the postIndex, otherwise just the first one in the list
	if (isCarousel) {
		const selectedMediaId = carouselMediaIds[postIndex];
		mediaUrl = mediaUrls.filter((url) => url.id == selectedMediaId)[0].contentUrl;
	} else {
		mediaUrl = mediaUrls[0];
	}

	// get file extension and create a file name
	const extension = mediaUrl
		.split("?")[0] // split on ? and get the first result. this removes any query params from the string.
		.match(/(\.[a-zA-Z0-9]*)$/g)[0] // get the extension from the url by finding a match with this regex .[a-zA-Z0-9]*  -  and it MUST be the ending part of the url
		.split(".")[1]; // remove the .

	const fileName = `${postId}_${postIndex}.${extension}`;

	// download media
	downloadMedia(mediaUrl, fileName);
}

function getPostData(post) {
	console.log("[DOWNLOADER] :: Getting post data");

	const postUrl =
		document.URL.match(/(\/p\/)[A-Za-z0-9_-]+(\/)(?=.*|$)/g)?.[0] ?? // use current URL if it has a post ID in it
		post // otherwise search for the post ID within the post HTML
			.find("a[href]")
			.filter((_, elem) =>
				$(elem)
					.attr("href")
					?.match(/^(\/p\/)[A-Za-z0-9_-]+(\/)(?=.*|$)/g)
			)
			.first()
			.attr("href");

	const isCarousel = post.find("div._aamj._acvz._acnc._acng").length > 0;

	let postIndex = 0;
	if (isCarousel) {
		postIndex = post
			.find("div._aamj._acvz._acnc._acng")
			.children()
			.map((index, elem) => {
				return $(elem).hasClass("_acnf") ? index : -1;
			})
			.get()
			.filter((index) => index !== -1)[0];
	}

	const postId = postUrl.match(/(?<=\/p\/)[A-Za-z0-9_-]+(?=\/)/g)[0];

	return {
		postUrl,
		postId,
		postIndex,
		isCarousel,
	};
}

async function getPostMedia(postUrl, isCarousel) {
	console.log("[DOWNLOADER] :: Getting post media url(s)");

	return await fetch(postUrl + "?__a=1&__d=dis")
		.then((response) => response.json())
		.then((data) => {
			const singularUrl = data.items[0]?.video_versions?.[0]?.url ?? data.items[0]?.image_versions2?.candidates[0]?.url;
			const carouselUrls =
				data.items[0]?.carousel_media?.map((media) => {
					return {
						id: media.id.match(/^[0-9]+(?=_)/g),
						contentUrl: media?.video_versions?.[0]?.url ?? media?.image_versions2?.candidates[0]?.url,
					};
				}) ?? [];

			const mediaUrls = !isCarousel ? [singularUrl] : carouselUrls;

			return {
				username: data.items[0]?.user?.username ?? "unknown",
				mediaUrls,
				carouselMediaIds: data.items[0]?.carousel_media_ids ?? -1,
			};
		})
		.catch((error) => console.error("Error:", error));
}

async function downloadMedia(mediaUrl, filename) {
	console.log(`[DOWNLOADER] :: Starting download of media: ${filename}`);

	const response = await fetch(mediaUrl);
	const arrayBuffer = await response.arrayBuffer();
	const blob = new Blob([arrayBuffer], { type: response.headers.get("Content-Type") });
	const urlCreator = window.URL || window.webkitURL;
	const downloadUrl = urlCreator.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = downloadUrl;
	a.download = filename;
	a.click();
}

function waitForXPathElem(selector) {
	return new Promise((resolve) => {
		if (getElemByXPath(selector)) {
			return resolve(getElemByXPath(selector));
		}

		const observer = new MutationObserver((mutations) => {
			if (getElemByXPath(selector)) {
				observer.disconnect();
				resolve(getElemByXPath(selector));
			}
		});

		// If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

function getElemByXPath(selector) {
	return document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function checkIfXPathExists(selector) {
	return getElemByXPath(selector) ? true : false;
}

function debounce(fn, delay) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
}
