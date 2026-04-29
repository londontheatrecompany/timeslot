import { ApplicationServerKeys, setWebCrypto } from 'webpush-webcrypto';
import crypto from 'crypto';
setWebCrypto(crypto.webcrypto);
const pub = "BFhUfEJoK0EwQeiCbM6bZl_8J0q061C4X0v4-IJlBn_fZLiC_mVqGwqA5gWBjxHwYf6iZm3DFcD4hyam7WpAMUQ";
const priv = "J78DNx7gX_Qy4zXLKhcKSZEoqZYxhmWJdFsHeJT7hTw";
ApplicationServerKeys.fromJSON({ publicKey: pub, privateKey: priv })
  .then(() => console.log('success'))
  .catch(e => console.error('fail:', e.message));
