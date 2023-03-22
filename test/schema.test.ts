import { Elysia, t } from '../src'

import { describe, expect, it } from 'bun:test'
import { post, req } from './utils'

describe('Schema', () => {
	it('validate query', async () => {
		const app = new Elysia().get('/', ({ query: { name } }) => name, {
			schema: {
				query: t.Object({
					name: t.String()
				})
			}
		})
		const res = await app.handle(req('/?name=sucrose'))

		expect(await res.text()).toBe('sucrose')
		expect(res.status).toBe(200)
	})

	it('validate params', async () => {
		const app = new Elysia().get(
			'/hi/:id/:name',
			({ params: { name } }) => name,
			{
				schema: {
					params: t.Object({
						id: t.String(),
						name: t.String()
					})
				}
			}
		)
		const res = await app.handle(req('/hi/1/sucrose'))

		expect(await res.text()).toBe('sucrose')
		expect(res.status).toBe(200)
	})

	it('validate headers', async () => {
		const app = new Elysia().post('/', () => 'welcome back', {
			schema: {
				headers: t.Object({
					authorization: t.String()
				})
			}
		})
		const res = await app.handle(
			new Request('http://localhost/', {
				method: 'post',
				headers: {
					authorization: 'Bearer 123',
					// optional header should be allowed
					'x-forwarded-ip': '127.0.0.1'
				}
			})
		)

		expect(await res.text()).toBe('welcome back')
		expect(res.status).toBe(200)
	})

	it('validate body', async () => {
		const app = new Elysia().post('/', ({ body }) => body, {
			schema: {
				body: t.Object({
					username: t.String(),
					password: t.String()
				})
			}
		})

		const body = JSON.stringify({
			username: 'ceobe',
			password: '12345678'
		})

		const res = await app.handle(
			new Request('http://localhost/', {
				method: 'post',
				body,
				headers: {
					'content-type': 'application/json'
				}
			})
		)

		expect(await res.text()).toBe(body)
		expect(res.status).toBe(200)
	})

	it('validate response', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				schema: {
					response: t.String()
				}
			})
			.get('/invalid', () => 1 as any, {
				schema: {
					response: t.String()
				}
			})
		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(400)
	})

	it('validate beforeHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				beforeHandle() {
					return 'Mutsuki need correction 💢💢💢'
				},
				schema: {
					response: t.String()
				}
			})
			.get('/invalid', () => 1 as any, {
				beforeHandle() {
					return 1 as any
				},
				schema: {
					response: t.String()
				}
			})
		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(400)
	})

	it('validate afterHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				afterHandle() {
					return 'Mutsuki need correction 💢💢💢'
				},
				schema: {
					response: t.String()
				}
			})
			.get('/invalid', () => 1 as any, {
				afterHandle() {
					return 1 as any
				},
				schema: {
					response: t.String()
				}
			})
		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(400)
	})

	it('validate beforeHandle with afterHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				beforeHandle() {
					// Not Empty
				},
				afterHandle() {
					return 'Mutsuki need correction 💢💢💢'
				},
				schema: {
					response: t.String()
				}
			})
			.get('/invalid', () => 1 as any, {
				afterHandle() {
					return 1 as any
				},
				schema: {
					response: t.String()
				}
			})
		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(400)
	})

	it('validate response per status', async () => {
		const app = new Elysia().post(
			'/',
			({ set, body: { status, response } }) => {
				set.status = status

				return response
			},
			{
				schema: {
					body: t.Object({
						status: t.Number(),
						response: t.Any()
					}),
					response: {
						200: t.String(),
						201: t.Number()
					}
				}
			}
		)

		const r200valid = await app.handle(
			post('/', {
				status: 200,
				response: 'String'
			})
		)
		const r200invalid = await app.handle(
			post('/', {
				status: 200,
				response: 1
			})
		)

		const r201valid = await app.handle(
			post('/', {
				status: 201,
				response: 1
			})
		)
		const r201invalid = await app.handle(
			post('/', {
				status: 201,
				response: 'String'
			})
		)

		expect(r200valid.status).toBe(200)
		expect(r200invalid.status).toBe(400)
		expect(r201valid.status).toBe(201)
		expect(r201invalid.status).toBe(400)
	})

	it('handle guard hook', async () => {
		const app = new Elysia().guard(
			{
				schema: {
					query: t.Object({
						name: t.String()
					})
				}
			},
			(app) =>
				app
					// Store is inherited
					.post('/user', ({ query: { name } }) => name, {
						schema: {
							body: t.Object({
								id: t.Number(),
								username: t.String(),
								profile: t.Object({
									name: t.String()
								})
							})
						}
					})
		)

		const body = JSON.stringify({
			id: 6,
			username: '',
			profile: {
				name: 'A'
			}
		})

		const valid = await app.handle(
			new Request('http://localhost/user?name=salt', {
				method: 'POST',
				body,
				headers: {
					'content-type': 'application/json',
					'content-length': body.length.toString()
				}
			})
		)

		expect(await valid.text()).toBe('salt')
		expect(valid.status).toBe(200)

		const invalidQuery = await app.handle(
			new Request('http://localhost/user', {
				method: 'POST',
				body: JSON.stringify({
					id: 6,
					username: '',
					profile: {
						name: 'A'
					}
				})
			})
		)

		expect(invalidQuery.status).toBe(400)

		// const invalidBody = await app.handle(
		// 	new Request('http://localhost/user?name=salt', {
		// 		method: 'POST',
		// 		body: JSON.stringify({
		// 			id: 6,
		// 			username: '',
		// 			profile: {}
		// 		})
		// 	})
		// )

		// expect(invalidBody.status).toBe(400)
	})
})
