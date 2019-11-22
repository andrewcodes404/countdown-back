const { forwardTo } = require('prisma-binding')
const Query = {
    users: forwardTo('db'),
    libraryItems: forwardTo('db'),
    userLoggedIn(parent, args, ctx, info) {
        // check if there is a current user ID
        if (!ctx.request.userId) {
            return null
        }
        return ctx.db.query.user(
            {
                where: { id: ctx.request.userId },
            },
            info
        )
    },

    // getCDW(parent, args, ctx, info) {
    //     // check if there is a current user ID
    //     // if (!ctx.request.userId) {
    //     //     return null
    //     // }
    //     console.log('args = ', args)

    //     return ctx.db.query.users(
    //         {
    //             where: { id: args.id },
    //         },
    //         info
    //     )
    // },
}
module.exports = Query
