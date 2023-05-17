/**
 * {@link HttpMethod} enumerates all supported HTTP request methods.
 *
 * @see #GET
 * @see #POST
 * @see #PUT
 * @see #DELETE
 * @see #HEAD
 */
export enum HttpMethod {
	/**
	 * Requests a representation of a specified resource.
	 */
	GET = "GET",

	/**
	 * Submits an entity to a specified resource.
	 */
	POST = "POST",

	/**
	 * Deletes the specified resource.
	 */
	DELETE = "DELETE",

	/**
	 * Replaces all current representations of a specified resource.
	 */
	PUT = "PUT",

	/**
	 * Requests informational headers for the specified resource
	 */
	HEAD = "HEAD"
}