/**
 * Simple Credentials implementation based on a username / password pair.
 */
export class Credentials {
	private readonly username: string;
	private readonly password: string;

	/**
	 * Creates new {@link Credentials} that can be used to establish user identity.
	 *
	 * @param username The name string value of the user.
	 * @param password The password string value of the user.
	 */
	constructor(username: string, password: string) {
		this.username = username;
		this.password = password
	}

	/**
	 * Returns the username as string value
	 *
	 * @return the username as string value
	 */
	getUsername(): string {
		return this.username;
	}

	/**
	 * Returns the password as string value
	 *
	 * @return the password as string value
	 */
	getPassword(): string {
		return this.password;
	}
}