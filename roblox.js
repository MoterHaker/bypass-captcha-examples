// npm install @antiadmin/anticaptchaofficial puppeteer
// run with command: "node roblox.js"


const anticaptcha = require("@antiadmin/anticaptchaofficial");
const pup = require("puppeteer");



//API key for anti-captcha.com
const anticaptchaAPIKey = 'API_KEY_HERE';


const login = 'ROBLOX_LOGIN';
const password = 'ROBLOX_PASSWORD';

const proxyIPPort = null;
const proxyUser = null;
const proxyPassword = null;

let xfrToken = null;
let browser = null;
let page = null;
let token = 'empty';
let datablob = null;
let loginAttempt = 0;

(async () => {
    
    anticaptcha.setAPIKey(anticaptchaAPIKey);
    const balance = await anticaptcha.getBalance();
    if (balance <= 0) {
        console.log('Buy your anticaptcha balance!');
        return;
    } else {
        console.log('API key balance is '+balance+', continuing');
        // anticaptcha.shutUp(); //uncomment for silent captcha recognition
    }

    try {
        console.log('opening browser ..');
        let options = {
            headless: false,
            ignoreHTTPSErrors: true,
            devtools: true
        };
        if (proxyIPPort) {
            options["args"] = '--proxy-server='+proxyIPPort;
        }
        browser = await pup.launch(options);

        console.log('creating new tab ..');
        page = await browser.newPage();
    } catch (e) {
        failCallback("could not open browser");
        return false;
    }


    await page.exposeFunction("successCallback", successCallback);
    await page.exposeFunction("failCallback", failCallback);


    console.log('changing window size .. ');
    await page.setViewport({width: 1360, height: 1000});

    if (proxyPassword && proxyUser) {
        console.log('setting proxy authentication .. ');
        await page.authenticate({
            username: proxyPassword,
            password: proxyUser,
        });
    }

    console.log('opening target page ..');
    await page.goto('https://www.roblox.com/newlogin', {waitUntil: "networkidle0"});

    console.log('filling form ..');
    await page.$eval('#login-username', (element, login) => {
        element.value = login;
        element.dispatchEvent(new Event('change'));
    }, login);
    await page.$eval('#login-password', (element, password) => {
        element.value = password;
        element.dispatchEvent(new Event('change'));
    }, password);

    //hook to catch CSRF token
    page.on('response', async (response) => {
    if (response.url() == "https://auth.roblox.com/v2/login" && xfrToken == null){
            console.log('XHR response received');
            let result = await response;
            let json = null;
            try {
                json = await result.json();
            } catch (e) {
                console.log('got 403 error as expected');
            }

            if (json === null) {
                console.log('could not retrieve response');
                loginAttempt++;
                if (loginAttempt > 1) {
                    failCallback('could not retrieve response from /v2/login');
                }
                return;
            }

            console.log('intercepted response JSON:')
            console.log(json);
            datablob = json.errors[0]["fieldData"];
            console.log('errors:')
            console.log(json.errors);
            console.log('field data: '+datablob);

            // console.log('intercepted request headers:');
            // console.log(result._request._headers);
            xfrToken = result._request._headers['x-csrf-token'];
            console.log('xfr token: '+xfrToken);
            makeAJAXRequestWithXFR(xfrToken);
        }
    });


    //intercepting evaluation page log
    page.on('console', msg => console.log('EVAL LOG:', msg.text()));


    console.log('submitting form ..');

    try {
        await Promise.all([
            page.click("#login-button"),
            page.waitForNavigation({waitUntil: 'networkidle0'}),
        ]);
    } catch (e) {

    }

})();



function makeAJAXRequestWithXFR() {

    (async () => {


        console.log('xfr:' + xfrToken);
        if (xfrToken == null) {
            failCallback('empty xfr token');
            return;
        }

        console.log('blob:' + datablob);
        if (datablob == null) {
            failCallback('empty datablob token');
            return;
        }

        console.log("\n\nGot all required data, solving Funcaptcha with Anti-Captcha.com ..\n");

        anticaptcha.settings.funcaptchaApiJSSubdomain = 'roblox-api.arkoselabs.com';
        anticaptcha.settings.funcaptchaDataBlob = datablob;
        try {
            token = await anticaptcha.solveFunCaptchaProxyless('https://www.roblox.com/login', '476068BF-9607-4799-B53D-966BE98E2B81');
        } catch (e) {
            failCallback('captcha not solved: '+e);
            return;
        }

        console.log('Funcaptcha token from Anti-Captcha: '+token);

        const evalParams = {
            login,
            password,
            xfrToken,
            token
        };

        await page.evaluate(async (evalParams) => {
            console.log('making ajax call with login '+evalParams.login+', password '+evalParams.password+', XFR token "'+evalParams.xfrToken+'" and funcaptcha token "'+evalParams.token+'"');
            const response = await fetch('https://auth.roblox.com/v2/login', {
                  method: "POST",
                  body: JSON.stringify({
                      "cvalue":evalParams.login,
                      "ctype":"Username",
                      "password":evalParams.password,
                      "captchaToken":evalParams.token,
                      "captchaProvider":"PROVIDER_ARKOSE_LABS"
                  }),
                  headers: {
                      'Content-Type' : 'application/json;charset=UTF-8',
                      'Accept': 'application/json, text/plain, */*',
                      'x-csrf-token': evalParams.xfrToken
                  }
              });

            console.log('getting text');

            const resultJSON = await response.json();

            if (resultJSON.errors) {
                if (resultJSON.errors[0]["code"] === 2) {
                    console.log('did not pass captcha');
                    failCallback('did not pass captcha');
                    return;
                }
                if (resultJSON.errors[0]["code"] === 0) {
                    console.log('Token Validation Failed');
                    failCallback('Token Validation Failed');
                    return;
                }
                console.log('unknown error: '+resultJSON.errors[0]["message"]);
                failCallback(resultJSON.errors[0]["message"]);
                return;
            }
            if (resultJSON.user) {
                successCallback(resultJSON);
            } else {
                failCallback('user object not found');
            }


        }, evalParams);

    })();


}



function successCallback(userObject) {
    console.log('Successfully passed');
    console.log(userObject);
    // console.log('closing browser .. ');
    // browser.close();
}

function failCallback(code) {
    console.log('Failed to pass: '+code);
    // console.log('closing browser .. ');
    // browser.close();
}
