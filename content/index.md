---
title: "The Cloud Resume Challenge"
publish: true
tags:
  - intro
  - meta
  - cloudresumechallenge
date: 2025-12-10
---

> You can't remove the weighs from the gym.

This page has a visit counter:

<!-- Visit Counter -->

<div id="visit-counter" style="display: flex; gap: 3px; flex-direction: column;">

<div class="visit-count" style="font-size: 24px">Loading visit count...</div>

</div>

Go ahead. Reload the page. The counter will increase. 

This is not impressive.

Then you learn that the site is hosted on AWS and uses serverless technologies: A Lambda function reads, increases and saves the counter from and to a DynamoDB table. 

Still not impressed? 

The site's source code lives inside Github. A push to the backend repo's main branch triggers a Github Action. 

The Github Action uses Terraform to create or update the AWS resources that make up the site: the S3 bucket that store the original HTML files, the Cloudfront distribution (CDN) that makes the site load quicker worldwide, the API Gateway that invokes the Lambda function, ... 

The Github Action authenticates to AWS via OpenID Connect. To do so, the Github Action asks the Github server to sign a JSON web token with Github's private key. Github is happy to do so. Beforehand, I set up a trust relationship in AWS: I basically told AWS that Github may request AWS permissions via JSON web token, but only one particular branch of my backend repo is allowed to do that. So AWS receives the signed token from the Github Action, validates it against Github's public key and checks: "Is that token from Github? If so, did Github sign it for sebastian's backend repo? And for the authorized branch?". Only if everything checks out, AWS returns temporary credentials to the Github Action. The Github Action uses these credentials to assume an AWS IAM role and accesses my AWS tenant. That IAM Role only has the necessary privileges – for example: the Github Action is NOT allowed to cancel my domain or launch cloud GPUs. But it may update most of my infrastructure.

Oh, come on, still not impressed? 

Well, that's fine. 

Because after all it is not about impressing you, but rather about gaining skills. 

From a productivity point of view, the [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) and its [Terraform Extension](https://cloudresumechallenge.dev/docs/extensions/terraform-getting-started/) do not really make sense. They are overly complicated for what they achieve – a website with a visit counter. 
 
But that is the whole point: 

- Practice over theory. 
- Learn just what you need when you need it.
- Making progress by building something. 

So, I guess this site is the first barbell I lifted in the »Cloud gym«. 

PS: Feel free to check out the [backend source code (Terraform)](https://github.com/sebastiankraska/cloud-resume-challenge-backend) and the [frontend source code (Quartz)](https://github.com/sebastiankraska/quartz) (and the [obsolete Hugo frontend](https://github.com/sebastiankraska/cloud-resume-challenge-frontend)).
