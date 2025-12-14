Last login: Sat Dec 13 07:15:26 on console
jmac@Jonathans-MacBook-Pro ~ % cd /Users/jmac/Documents/self-presale-audit
npx hardhat compile && npx hardhat test
Error HHE3: No Hardhat config file found.

You can initialize a new project by running Hardhat with --init

For more info go to https://hardhat.org/HHE3 or run Hardhat with --show-stack-traces
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat --config hardhat.config.cjs compile
An unexpected error occurred:

TypeError: keyValidator._parse is not a function
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodDiscriminatedUnion._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2445:27)
    at ZodRecord._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2684:34)
    at ZodOptional._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3316:36)
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3239:48)
    at ZodEffects._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects.safeParse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:129:29)

If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat --config hardhat.config.cjs compile
Error HHE4: Config file hardhat.config.cjs not found

For more info go to https://hardhat.org/HHE4 or run Hardhat with --show-stack-traces
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat compile && npx hardhat test
An unexpected error occurred:

TypeError: keyValidator._parse is not a function
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodDiscriminatedUnion._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2445:27)
    at ZodRecord._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2684:34)
    at ZodOptional._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3316:36)
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3239:48)
    at ZodEffects._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects.safeParse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:129:29)

If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat compile && npx hardhat test
An unexpected error occurred:

TypeError: keyValidator._parse is not a function
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodDiscriminatedUnion._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2445:27)
    at ZodRecord._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:2684:34)
    at ZodOptional._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3316:36)
    at ZodObject._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:1961:37)
    at ZodObject._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects._parse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:3239:48)
    at ZodEffects._parseSync (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:100:29)
    at ZodEffects.safeParse (file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/node_modules/zod/v3/types.js:129:29)

If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug
jmac@Jonathans-MacBook-Pro self-presale-audit % rm -rf node_modules
jmac@Jonathans-MacBook-Pro self-presale-audit % npm install --legacy-peer-deps
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated phin@3.7.1: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated har-validator@5.1.5: this library is no longer supported
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated mkdirp@0.5.1: Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)
npm warn deprecated @paulmillr/qr@0.2.1: The package is now available as "qr": npm install qr
npm warn deprecated request@2.88.2: request has been deprecated, see https://github.com/request/request/issues/3142
npm warn deprecated source-map@0.8.0-beta.0: The work that was done in this beta branch won't be included in future versions
npm warn deprecated glob@8.1.0: Glob versions prior to v9 are no longer supported
npm warn deprecated @walletconnect/sign-client@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/ethereum-provider@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases

added 1819 packages, and audited 1820 packages in 37s

419 packages are looking for funding
  run `npm fund` for details

17 vulnerabilities (5 low, 4 moderate, 3 high, 5 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat compile && npx hardhat test
An unexpected error occurred:

Error: Cannot find module '/Users/jmac/Documents/self-presale-audit/node_modules/hardhat/types/network' imported from /Users/jmac/Documents/self-presale-audit/node_modules/@nomicfoundation/hardhat-ethers/dist/src/type-extensions.js
    at finalizeResolution (node:internal/modules/esm/resolve:274:11)
    at moduleResolve (node:internal/modules/esm/resolve:864:10)
    at defaultResolve (node:internal/modules/esm/resolve:990:11)
    at ModuleLoader.#cachedDefaultResolve (node:internal/modules/esm/loader:757:20)
    at ModuleLoader.#resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:793:38)
    at ModuleLoader.resolveSync (node:internal/modules/esm/loader:816:52)
    at ModuleLoader.#cachedResolveSync (node:internal/modules/esm/loader:776:25)
    at ModuleLoader.getModuleJobForRequire (node:internal/modules/esm/loader:474:50)
    at ModuleJobSync.#link (node:internal/modules/esm/module_job:447:34)
    at new ModuleJobSync (node:internal/modules/esm/module_job:420:17) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/jmac/Documents/self-presale-audit/node_modules/hardhat/types/network'
}
jmac@Jonathans-MacBook-Pro self-presale-audit % rm -rf node_modules
jmac@Jonathans-MacBook-Pro self-presale-audit % npm install --legacy-peer-deps
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated phin@3.7.1: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated har-validator@5.1.5: this library is no longer supported
npm warn deprecated glob@8.1.0: Glob versions prior to v9 are no longer supported
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
npm warn deprecated mkdirp@0.5.1: Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)
npm warn deprecated @paulmillr/qr@0.2.1: The package is now available as "qr": npm install qr
npm warn deprecated request@2.88.2: request has been deprecated, see https://github.com/request/request/issues/3142
npm warn deprecated source-map@0.8.0-beta.0: The work that was done in this beta branch won't be included in future versions
npm warn deprecated @walletconnect/sign-client@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.21.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/ethereum-provider@2.21.1: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases

added 1813 packages, and audited 1814 packages in 22s

419 packages are looking for funding
  run `npm fund` for details

17 vulnerabilities (5 low, 4 moderate, 3 high, 5 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.
jmac@Jonathans-MacBook-Pro self-presale-audit % qqqqq
zsh: command not found: qqqqq
jmac@Jonathans-MacBook-Pro self-presale-audit % npx hardhat compile && npx hardhat test
✖ Help us improve Hardhat with anonymous crash reports & basic usage data? (Y/n) · y

Downloading compiler 0.8.20
Compiled 13 Solidity files successfully (evm target: paris).
✖ Help us improve Hardhat with anonymous crash reports & basic usage data? (Y/n) · y

An unexpected error occurred:

ReferenceError: require is not defined in ES module scope, you can use import instead
This file is being treated as an ES module because it has a '.js' file extension and '/Users/jmac/Documents/self-presale-audit/package.json' contains "type": "module". To treat it as a CommonJS script, rename it to use the '.cjs' file extension.
    at file:///Users/jmac/Documents/self-presale-audit/test/SELFPresale.test.js:1:20
    at ModuleJob.run (node:internal/modules/esm/module_job:377:25)
    at onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:691:26)
    at formattedImport (/Users/jmac/Documents/self-presale-audit/node_modules/mocha/lib/nodejs/esm-utils.js:9:14)
    at Object.exports.requireOrImport (/Users/jmac/Documents/self-presale-audit/node_modules/mocha/lib/nodejs/esm-utils.js:42:28)
    at Object.exports.loadFilesAsync (/Users/jmac/Documents/self-presale-audit/node_modules/mocha/lib/nodejs/esm-utils.js:100:20)
    at SimpleTaskDefinition.action (/Users/jmac/Documents/self-presale-audit/node_modules/hardhat/src/builtin-tasks/test.ts:132:9)
    at Environment._runTaskDefinition (/Users/jmac/Documents/self-presale-audit/node_modules/hardhat/src/internal/core/runtime-environment.ts:351:14)
    at Environment.run (/Users/jmac/Documents/self-presale-audit/node_modules/hardhat/src/internal/core/runtime-environment.ts:184:14)
    at SimpleTaskDefinition.action (/Users/jmac/Documents/self-presale-audit/node_modules/hardhat/src/builtin-tasks/test.ts:196:28)
jmac@Jonathans-MacBook-Pro self-presale-audit % 
