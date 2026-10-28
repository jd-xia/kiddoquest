/* Public game settings. No secrets belong here.
   This laptop serves the game and both APIs at http://localhost:8000.
   The page published at https://jd-xia.github.io uses HMF_SERVICE instead.
   That value must be the laptop's public https address, with no trailing slash.
   Leave it empty until the address exists. An https page cannot call an http service. */
const HMF_SERVICE='https://mvinb-2207.tail5e7276.ts.net';
const HMF_API=(location.hostname==='jd-xia.github.io'?HMF_SERVICE:'http://localhost:8000').replace(/\/$/,'');
window.HMF_CLOUD={
  googleClientId:'669511875089-psnjdrjcfl3v8pc7kktm11bu8a3aau7p.apps.googleusercontent.com',
  authBase:HMF_API,
  dataBase:HMF_API
};
