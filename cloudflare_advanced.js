/*

Cloudflare bypass with AntiBotCookieTask from Anti-Captcha.com.
Install dependencies:

npm install @antiadmin/anticaptchaofficial puppeteer


* */

const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require('puppeteer');

//address behind cloudflare
const checkUrl = 'https://www.sportsbikeshop.co.uk/';
const domainName = 'www.sportsbikeshop.co.uk';


//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';

// STOP! IMPORTANT! Shared proxy services won't work!
// Use ONLY self-installed proxies on your own infrastructure! Instruction: https://anti-captcha.com/apidoc/articles/how-to-install-squid
// Again and again people people insist they have best purchased proxies. NO YOU DO NOT!
// Absolutely recommended to read this FAQ about proxies: https://anti-captcha.com/faq/510_questions_about_solving_recaptcha_with_proxy__applies_to_funcaptcha__geetest__hcaptcha_


const proxyAddress = '1.2.3.4';
const proxyPort = 1234;
const proxyLogin = 'mylogin';
const proxyPassword = 'mypass';


let browser = null;
let page = null;


(async () => {

    anticaptcha.setAPIKey(apiKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Topup your anti-captcha.com balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }

    let antigateResult = null;
    try {
        antigateResult = await anticaptcha.solveAntiBotCookieTask(
            checkUrl,
            proxyAddress,
            proxyPort,
            proxyLogin,
            proxyPassword);
    } catch (e) {
        console.error("could not solve captcha: "+e.toString());
        return;
    }

    const fingerPrint = antigateResult.fingerprint;

    try {
        console.log('opening browser ..');


        let options = {
            headless: true, //disable to see the browser window
            devtools: false, //enable to see developers console
            args: [
                '--window-size='+fingerPrint['self.screen.width']+','+fingerPrint['self.screen.height'],
                `--proxy-server=${proxyAddress}:${proxyPort}`
            ],

        };
        browser = await pup.launch(options);

        console.log('creating new page ..');
        page = await browser.newPage();
    } catch (e) {
        console.log("could not open browser: "+e);
        return false;
    }

    if (proxyPassword && proxyLogin) {
        console.log(`setting proxy authentication ${proxyLogin}:${proxyPassword}`);
        await page.authenticate({
            username: proxyLogin,
            password: proxyPassword,
        });
    }

    //screen size
    console.log('setting view port to '+fingerPrint['self.screen.width']+'x'+fingerPrint['self.screen.height']);
    await page.setViewport({width: fingerPrint['self.screen.width'], height: fingerPrint['self.screen.height']});

    //user agent
    let userAgent = '';
    if (fingerPrint['self.navigator.userAgent']) {
        userAgent = fingerPrint['self.navigator.userAgent'];
    } else {
        if (fingerPrint['self.navigator.appVersion'] && fingerPrint['self.navigator.appCodeName']) {
            userAgent = fingerPrint['self.navigator.appCodeName'] + '/' + fingerPrint['self.navigator.appVersion']
        }
    }
    console.log('setting browser user agent to '+userAgent);
    await page.setUserAgent(userAgent);

    console.log('setting cookies', antigateResult.cookies);
    let cookies = [];
    for (const name in antigateResult.cookies) {
        cookies.push({ name: name, value: antigateResult.cookies[name], domain: domainName })
    }
    await page.setCookie(...cookies);

    try {
        await page.goto(antigateResult.url, {
            waitUntil: "networkidle0"
        });
    } catch (e) {
        console.log('err while loading the page: '+e);
    }

    const htmlContent = await page.content();
    console.log("page content:\n\n", htmlContent);


})();

