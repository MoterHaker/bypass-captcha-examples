/*

fazenda.gov.br bypass example with Anti Captcha.

IMPORTANT!
1. Make sure "const userAgent" is same as in your Chromium instance
2. Set your API key ("apiKey")
3. Set correct form password value ("formPassword")
4. The page is using Hcaptcha Enterprise. This is why we do several attempts to bypass the screen (howManyTestsToMake value).
5. If you want to see what's happening, replace "headless: true" with "headless: false".

Install dependencies:

npm install @antiadmin/anticaptchaofficial puppeteer


* */


const pup = require('puppeteer')

const anticaptcha = require("@antiadmin/anticaptchaofficial");

//screen with captcha
const captchaUrl = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=';

//address behind captcha
const checkUrl = 'https://www.nfe.fazenda.gov.br/portal/consultaResumo.aspx?tipoConteudo=7PhJ+gAVw2g=';

//Anti-captcha.com API key
const apiKey = 'API_KEY_HERE';

const formPassword = '44_DIGIT_CODE_HERE_44_DIGIT_CODE_HERE_44_DIG';

const howManyTestsToMake = 10;

let browser = null;
let page = null;
let success = 0;
let fail = 0;
let userAgent = '';

// STOP! IMPORTANT! Shared proxy services won't work!
// Use ONLY self-installed proxies on your own infrastructure! Instruction: https://anti-captcha.com/apidoc/articles/how-to-install-squid
const proxyAddress = '1.2.3.4';
const proxyPort = 1234;
const proxyLogin = 'login';
const proxyPassword = 'pass';

(async () => {

    anticaptcha.setAPIKey(apiKey);
    anticaptcha.shutUp(); //comment for verbose captcha recognition
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Topup your anti-captcha.com balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
    }

    for (let i=0;i<howManyTestsToMake;i++) {

        console.log("\nSolving HCaptcha with Anti-Captcha.Com ..");

        let hcaptchaResponse = null;
        try {
            hcaptchaResponse = await anticaptcha.solveHCaptchaProxyOn(
                captchaUrl,
                'e72d2f82-9594-4448-a875-47ded9a1898a',
                'http',
                proxyAddress,
                proxyPort,
                proxyLogin,
                proxyPassword,
                '',
                '',
                {}
            );
            userAgent = anticaptcha.getHcaptchaUserAgent();
        } catch (e) {
            console.error("could not solve captcha: " + e.toString());
            return;
        }
        console.log('hcaptchaResponse:', hcaptchaResponse);


        try {
            console.log('opening browser ..');


            let options = {
                headless: false,
                ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
                devtools: true,
                args: [
                    `--proxy-server=${proxyAddress}:${proxyPort}`,
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--allow-running-insecure-content',
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--mute-audio',
                    '--no-zygote',
                    '--no-xshm',
                    '--window-size=1920,1080',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--enable-webgl',
                    '--ignore-certificate-errors',
                    '--lang=en-US,en;q=0.9',
                    '--password-store=basic',
                    '--disable-gpu-sandbox',
                    '--disable-software-rasterizer',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-infobars',
                    '--disable-breakpad',
                    '--disable-canvas-aa',
                    '--disable-2d-canvas-clip-aa',
                    '--disable-gl-drawing-for-tests',
                    '--enable-low-end-device-mode',
                    '--no-sandbox'
                ]
            };
            browser = await pup.launch(options);


            console.log('creating new page ..');
            page = await browser.newPage();

            console.log('setting browser user agent to ',userAgent);
            await page.setUserAgent(userAgent);

            await page.evaluateOnNewDocument(() => {
                delete navigator.__proto__.webdriver;
            });

            if (proxyPassword && proxyLogin) {
                console.log(`setting proxy authentication ${proxyLogin}:${proxyPassword}`);
                await page.authenticate({
                    username: proxyLogin,
                    password: proxyPassword,
                });
            }
        } catch (e) {
            console.error("could not open browser: " + e);
            return false;
        }

        //screen size
        await page.setViewport({width: 1360, height: 1000});


        try {
            await page.goto(captchaUrl, {
                waitUntil: "networkidle0",
                timeout: 300000
            });
        } catch (e) {
            console.log('err while loading the page: ' + e);
        }

        console.log('Filling h-captcha-response');
        await page.evaluate(async (hcaptchaResponse) => {

            document.getElementsByName('h-captcha-response')[0].value = hcaptchaResponse;

        }, hcaptchaResponse);

        console.log('Filling password ',formPassword);
        await page.type('#ctl00_ContentPlaceHolder1_txtChaveAcessoResumo', formPassword);


        console.log('Waiting 3 seconds...');
        await delay(3000);

        console.log('Submitting form');
        await page.click('#ctl00_ContentPlaceHolder1_btnConsultarHCaptcha');


        console.log('Waiting 3 seconds...');
        await delay(3000);


        console.log('Checking if we are on correct page');
        let currentUrl = await page.evaluate(async () => {
            return new Promise((resolve => {
                resolve(document.location.href);
            }))
        });
        if (currentUrl === checkUrl) {
            console.log('SUCCESS: We are on the target page ' + checkUrl);
            success++;
        } else {
            console.log('FAIL: We are not on the target page: ' + currentUrl);
            await anticaptcha.reportIncorrectHcaptcha();
            fail++;
        }

        console.log('success = ',success);
        console.log('fail = ',fail);


        await delay(3000);

        await browser.close();

    }



})();

function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}


