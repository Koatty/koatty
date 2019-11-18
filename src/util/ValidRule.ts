/**
 * Checks if value is a md5 string.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function md5(value: string): boolean {
    return (/^[a-f0-9]{32}$/).test(value.toLowerCase());
}

/**
 * Checks if value is a email.
 *
 * @param {string} value
 * @returns
 */
export function email(value: string): boolean {
    const reg = /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/;
    return reg.test(value);
}

/**
 * Checks if value is a chinese name.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function cnname(value: string): boolean {
    const reg = /^[\u4E00-\u9FA5A-Za-z\s]+(·[\u4E00-\u9FA5A-Za-z]+)*$/;
    return reg.test(value);
}

/**
 * Checks if value is a idcard number.
 *
 * @param {string} value
 * @returns
 */
export function idnumber(value: string): boolean {
    if (/^\d{15}$/.test(value)) {
        return true;
    }
    if ((/^\d{17}[0-9X]$/).test(value)) {
        const vs = '1,0,x,9,8,7,6,5,4,3,2'.split(',');
        const ps: any[] = '7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2'.split(',');
        const ss: any[] = value.toLowerCase().split('');
        let r = 0;
        for (let i = 0; i < 17; i++) {
            r += ps[i] * ss[i];
        }
        const isOk = (vs[r % 11] === ss[17]);
        return isOk;
    }
    return false;
}

/**
 * Checks if value is a mobile phone number.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function mobile(value: string): boolean {
    const reg = /^(13|14|15|16|17|18|19)\d{9}$/;
    return reg.test(value);
}

/**
 * Checks if value is a zipcode.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function zipcode(value: string): boolean {
    const reg = /^\d{6}$/;
    return reg.test(value);
}

/**
 * Checks if value is a url.
 *
 * @param {string} value
 * @returns
 */
export function url(value: string): boolean {
    const reg = /^http(s?):\/\/(?:[A-za-z0-9-]+\.)+[A-za-z]{2,4}(?:[\/\?#][\/=\?%\-&~`@[\]\':+!\.#\w]*)?$/;
    return reg.test(value);
}