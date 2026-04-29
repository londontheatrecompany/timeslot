import crypto from 'crypto';

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
    const pubBytes = decodeBase64URL(pubStr);
    const privBytes = decodeBase64URL(privStr);

    const publicKey = await crypto.webcrypto.subtle.importKey(
        "raw",
        pubBytes,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        []
    );

    const jwk = {
        kty: "EC",
        crv: "P-256",
        x: encodeBase64URL(pubBytes.slice(1, 33)),
        y: encodeBase64URL(pubBytes.slice(33, 65)),
        d: encodeBase64URL(privBytes),
        ext: true
    };

    const privateKey = await crypto.webcrypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    );
    console.log("Success! public:", publicKey.type, "private:", privateKey.type);
}
run();
