const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

var mailgun = require('mailgun-js')({
    apiKey: process.env.API_KEY,
    domain: process.env.DOMAIN,
    host: 'api.eu.mailgun.net',
})

const Mutations = {
    async userRegister(parent, args, ctx, info) {
        // 2. lowercase their email to prevent accidents
        args.email = args.email.toLowerCase()
        // 3. hash their password                SALT LENGTH 👇
        const password = await bcrypt.hash(args.password, 10)
        // 4. create the user in the database
        const user = await ctx.db.mutation.createUser(
            {
                data: {
                    ...args,
                    password,
                    permissions: { set: ['USER'] },
                },
            },
            info
        )
        // 5. create the JWT token for them
        const token = jwt.sign(
            { userId: user.id },
            process.env.APP_SECRET_FOR_JWT
        )

        // 6. We place the jwt as a cookie in the response
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        })

        // 7. Finalllllly we return the user to the browser
        return user
    },

    async userLogin(parent, { email, password }, ctx, info) {
        // 1. check if there is a user with that email
        const user = await ctx.db.query.user({ where: { email } })
        if (!user) {
            throw new Error(`No such user found for email ${email}`)
        }
        // 2. Check if their password is correct
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error('Invalid Password!')
        }
        // 3. generate the JWT Token
        const token = jwt.sign(
            { userId: user.id },
            process.env.APP_SECRET_FOR_JWT
        )
        // 4. Set the cookie with the token
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })

        //send email that the user logged in!!!
        const data = {
            // from: `${user.name} <mg@countdownwow.com>`,
            from: 'CDW Admin <mg@countdownwow.com>',
            // from: '<mg@countdownwow.com>',
            to: 'hello@countdownwow.com',
            subject: 'User Login',
            text: `User ${user.name} has logged in 🍰`,
        }

        mailgun.messages().send(data, (error, body) => {
            if (error) {
                console.log('error = ', error)
            }
        })

        // 5. Return the user
        return user
    },

    userLogout(parent, args, ctx, info) {
        ctx.response.clearCookie('token')

        return { message: 'Goodbye!' }
    },

    async createLibraryItem(parent, args, ctx, info) {
        const libraryItem = await ctx.db.mutation.createLibraryItem(
            {
                data: {
                    // This is how to create a relationship between the Item and the User
                    user: {
                        connect: {
                            id: ctx.request.userId,
                        },
                    },
                    ...args,
                },
            },
            info
        )

        return libraryItem
    },

    updateLibraryItem(parent, args, ctx, info) {
        // first take a copy of the updates

        const updates = { ...args }

        // remove the ID from the updates
        delete updates.id

        // run the update method
        return ctx.db.mutation.updateLibraryItem(
            {
                data: {
                    index: updates.index,
                },
                where: {
                    id: args.id,
                },
            },
            info
        )
    },

    async deleteLibraryItem(parent, args, ctx, info) {
        const where = { id: args.id }
        return ctx.db.mutation.deleteLibraryItem({ where }, info)
    },

    updateUser(parent, args, ctx, info) {
        // first take a copy of the updates

        const updates = { ...args }

        // remove the ID from the updates
        delete updates.id

        // run the update method
        return ctx.db.mutation.updateUser(
            {
                data: {
                    message: updates.message,
                    coverFull: updates.coverFull,
                    cover200: updates.cover200,
                    cover600: updates.cover600,
                    cover3000: updates.cover3000,
                },
                where: {
                    id: args.id,
                },
            },
            info
        )
    },
}

module.exports = Mutations
