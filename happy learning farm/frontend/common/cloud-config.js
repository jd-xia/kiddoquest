/* Public game settings. No secrets belong here.
   The game pages are on GitHub Pages. Nginx only exposes the OpenID and farm APIs.
   https://jd-xia.github.io calls HMF_SERVICE. This laptop calls http://localhost:8080.
   HMF_SERVICE is the public https gateway, with no trailing slash.
   An https page cannot call an http service. */
const HMF_SERVICE='https://mvinb-2207.tail5e7276.ts.net';
const HMF_API=(location.hostname==='jd-xia.github.io'?HMF_SERVICE:'http://localhost:8080').replace(/\/$/,'');
window.HMF_CLOUD={
  googleClientId:'669511875089-psnjdrjcfl3v8pc7kktm11bu8a3aau7p.apps.googleusercontent.com',
  authBase:HMF_API,
  dataBase:HMF_API
};
