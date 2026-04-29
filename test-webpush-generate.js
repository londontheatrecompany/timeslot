import crypto from 'crypto';
import { setWebCrypto, generatePushHTTPRequest } from 'webpush-webcrypto';

setWebCrypto(crypto.webcrypto);

const pubStr = "BFhUfEJoK0EwQeiCbM6bZl_8J0q061C4X0v4-IJlBn_fZLiC_mVqGwqA5gWBjxHwYf6iZm3DFcD4hyam7WpAMUQ";
const privStr = "J78DNx7gX_Qy4zXLKhcKSZEoqZYxhmWJdFsHeJT7hTw";

function decodeBase64URL(str) {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function encodeBase64URL(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(str, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function run() {
    try {
        const pubBytes = decodeBase64URL(pubStr);
        const privBytes = decodeBase64URL(privStr);

        const publicKey = await crypto.webcrypto.subtle.importKey(
            "raw", pubBytes, { name: "ECDSA", namedCurve: "P-256" }, true, []
        );

        const jwk = {
            kty: "EC", crv: "P-256",
            x: encodeBase64URL(pubBytes.slice(1, 33)),
            y: encodeBase64URL(pubBytes.slice(33, 65)),
            d: encodeBase64URL(privBytes),
            ext: true
        };

        const privateKey = await crypto.webcrypto.subtle.importKey(
            "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]
        );

        const applicationServerKeys = { publicKey, privateKey };

        const { headers, body, endpoint } = await generatePushHTTPRequest({
            applicationServerKeys,
            payload: JSON.stringify({ title: 'Test' }),
            target: {
                endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
                keys: {
                    p256dh: "BMoZJgS_4WcI29t_q3k-eZ16r2HnB7AHzZ9KqQ8w3hQ=",
                    auth: "Z8qX_p9R4f_H5M_Nq3a_fQ=="
                }
            },
            adminContact: 'mailto:admin@test.com'
        });

        console.log("Success generated payload");
    } catch(e) {
        console.error("FAIL:", e);
    }
}
run();
