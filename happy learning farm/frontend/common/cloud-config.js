/* Public game settings. No secrets belong here.
   The game pages are on GitHub Pages. Nginx only exposes the OpenID and farm APIs.
   https://jd-xia.github.io calls HMF_SERVICE. This laptop calls http://localhost:8080.
   GitHub Pages, m700, mvinb-2203, and mvinb-2207 call HMF_SERVICE. Other hostnames use their own origin.
   HMF_SERVICE is the public https gateway, with no trailing slash.
   An https page cannot call an http service. */
const HMF_SERVICE='https://m700.tail5e7276.ts.net';
const HMF_REMOTE_HOSTS=['jd-xia.github.io','mvinb-2203.tail5e7276.ts.net','mvinb-2207.tail5e7276.ts.net','m700.tail5e7276.ts.net'];
const HMF_API=(HMF_REMOTE_HOSTS.includes(location.hostname)?HMF_SERVICE:(location.hostname==='localhost'||location.hostname==='127.0.0.1'?'http://localhost:8080':location.origin)).replace(/\/$/,'');
window.HMF_CLOUD={
  googleClientId:'669511875089-psnjdrjcfl3v8pc7kktm11bu8a3aau7p.apps.googleusercontent.com',
  authBase:HMF_API,
  dataBase:HMF_API
};
