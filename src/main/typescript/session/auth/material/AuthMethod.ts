/**
 * The supported authorization methods, that may be used to build authorization {@link Headers}.
 */
export class AuthMethod {
    private readonly key: string;

    /**
     * Defines a new authorization method.
     *
     * @param key The string value of the authorization method.
     */
    public constructor(key: string) {
        this.key = key;
    }

    /**
     * Returns the string value of the authorization method.
     *
     * @return The string value of the authorization method.
     */
    public getKey(): string {
        return this.key;
    }
}

/**
 * {@link AuthMethod} bundles the supported authorization methods, that may be used to build authorization
 * {@link Headers}.
 *
 * @see #BASIC_AUTHORIZATION
 * @see #BEARER_AUTHORIZATION
 */
export const AuthMethods = {
    BASIC_AUTHORIZATION: new AuthMethod("Basic"),
    BEARER_AUTHORIZATION: new AuthMethod("Bearer")
}