# IMPORTANT
# make sure to have "anticaptchaofficial" package version minimum 1.0.44
# pip install 'anticaptchaofficial>=1.0.44'
#
# Proxy usage is required. Each datadome cookie is associated with a proxy and user-agent.
#

from anticaptchaofficial.antigatetask import *

proxy_host = "11.11.11.11"
proxy_port = 1234
proxy_login = "login"
proxy_pass = "password"

proxies = {
    'https': f"http://{proxy_login}:{proxy_pass}@{proxy_host}:{proxy_port}",
    'http': f"http://{proxy_login}:{proxy_pass}@{proxy_host}:{proxy_port}"
}

solver = antigateTask()
solver.set_verbose(1)
solver.set_key("API_KEY_HERE")
solver.set_website_url("https://www.idealista.pt/en/comprar-empreendimentos/viseu-distrito/pagina-1")
solver.set_template_name("Anti-bot screen bypass")
solver.set_proxy_address(proxy_host)
solver.set_proxy_port(proxy_port)
solver.set_proxy_login(proxy_login)
solver.set_proxy_password(proxy_pass)
solver.set_variables({
    "css_selector": "iframe[src*='geo.captcha-delivery.com']"
})
solver.set_domains_of_interest(['www.idealista.pt', 'idealista.pt'])


result = solver.solve_and_return_solution()
if result != 0:

    fingerprint, domainsOfInterest = result["fingerprint"], result['domainsOfInterest']

    if 'idealista.pt' not in domainsOfInterest:
        print("could not find domain data in 'domainsOfInterest'")
        exit(1)

    print("data dome cookie: ", domainsOfInterest['idealista.pt']['cookies']['datadome'])

    r = requests.get('https://www.idealista.pt/en/comprar-empreendimentos/viseu-distrito/pagina-1', proxies=proxies, headers={
         'User-Agent': fingerprint['self.navigator.userAgent'],
         'Cookie': 'datadome=' + domainsOfInterest['idealista.pt']['cookies']['datadome'],
         'Accept-Encoding': 'deflate',
         'Accept': 'text/html',
         'accept-language': 'en'
    })
    print(r.text)


else:
    print("task finished with error "+solver.error_code)

