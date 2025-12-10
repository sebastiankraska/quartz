---
title: "Welcome"
publish: true
tags:
  - intro
  - meta
  - cloud resume challenge
date: 2025-12-10
---

> You can't remove the weighs from the gym

This site features a visit counter:

<!-- Visit Counter -->

<div id="visit-counter" style="display: flex; gap: 3px; flex-direction: column; align-items: center">

<div class="visit-count" style="font-size: 24px">Loading visit count...</div>

</div>

Go ahead. Reload the page. The counter will increase. 

You are right: This is not impressive. 

Then you learn that the site is hosted on AWS and uses serverless technologies for the visit counter, e.g. Lambda functions and DynamoDB. 

Still not impressed? 

The site's source code lives inside Github. A push on the main branch triggers a Github Action. The Github Action uses Terraform to create or update the site on AWS, e.g. the S3 bucket, an API gateway, a Cloudfront distribution, the Lambda function, etc.... everything the site is made up of. 

Github authenticates to AWS via OpenID Connect with a JSON Web Token. AWS receives this token and returns temporary credentials for an IAM role to the Github Action.  The IAM role has least-privilege permissions, e.g. the Github Action can only access the resources and actions it really needs to access.

Oh, come on, still not impressed? 

Well, that's fine. 

Because after all it is not about impressing you, but rather about gaining skills. 

From a productivity point of view, the [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) and its [Terraform Extension](https://cloudresumechallenge.dev/docs/extensions/terraform-getting-started/) do not really make sense. They are overly complicated for what they achieve – a website with a visit counter. 
 
But that is the whole point: 

Practice over theory. Learn just what you need when you need it. Making progress by building something. 

So, I guess this site is the first barbell I lifted in the »Cloud gym«. 

PS: Feel free to check out the [backend source code (Terraform)](https://github.com/sebastiankraska/cloud-resume-challenge-backend) and the [frontend source code (Quartz)](https://github.com/sebastiankraska/quartz) (and the [obsolete Hugo frontend](https://github.com/sebastiankraska/cloud-resume-challenge-frontend)).
