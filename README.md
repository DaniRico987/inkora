<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Email Setup (Gmail SMTP)

This project uses Gmail SMTP (Nodemailer) for transactional emails.

Required environment variables:

- `MAIL_HOST` (recommended: `smtp.gmail.com`)
- `MAIL_PORT` (`465` for SSL or `587` for TLS)
- `MAIL_USER` (your Gmail account)
- `MAIL_PASSWORD` (Google App Password)
- `MAIL_FROM` (example: `INKORA <your_mail@gmail.com>`)
- `MAIL_REPLY_TO` (optional)
- `MAIL_LOGO_URL` (optional public URL for your logo in email header)
- `FRONTEND_URL` (used to build password reset links)

Note: for Gmail you must enable 2-step verification and create an App Password.

Logo strategy:

- If `MAIL_LOGO_URL` is set, it is used as-is.
- If `MAIL_LOGO_URL` is not set, the system uses `${FRONTEND_URL}/branding/inkora-logo.png`.
- If neither is available in local preview generation, a dummy placeholder image is used.

Current email flows:

- Forgot password (`/auth/forgot-password`)
- Admin temporary password delivery (admin creation)
- Account blocked notification after repeated failed login attempts

Template preview (without sending emails):

```bash
$ npm run mail:preview
```

This command generates HTML/TXT previews under `mail-previews/`.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Database Seeding

To seed the database with initial data (like the root user), run:

```bash
# Seed the database
$ npx prisma db seed
```

This will create a default root user using the credentials defined in your `.env` file (see `.env.example`).

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Books Search API

Public endpoint for advanced catalog filtering:

```bash
GET /api/v1/books/search
```

Supported query params:

- `title`
- `author`
- `categoryId`
- `language`
- `condition` (`new` | `used`)
- `minPrice`
- `maxPrice`
- `year` (publication year)
- `page` (default `1`)
- `limit` (default `10`, max `100`)
- `sortBy` (`price` | `publicationYear` | `relevance`, default `relevance`)
- `sortOrder` (`asc` | `desc`, default `desc`)

Example:

```bash
GET /api/v1/books/search?title=principito&categoryId=1&minPrice=10000&maxPrice=50000&sortBy=price&sortOrder=asc&page=1&limit=12
```

## Search SLA Verification (<=2s)

Measure heavy search cases locally (p95 latency):

```bash
# start backend first in another terminal
$ npm run start:dev

# run latency checks
$ npm run perf:books-search
```

Optional env vars:

- `BOOKS_SEARCH_URL` (default `http://localhost:3000/api/v1/books/search`)
- `BOOKS_SEARCH_ITERATIONS` (default `20`)
- `BOOKS_SEARCH_SLA_MS` (default `2000`)

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
