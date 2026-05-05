---
title: Cloud Resume Challenge
publish: true
tags:
date: 2026-01-08
modified: 2026-01-08T08:50:15+01:00
---

This site was built with Terraform and is hosted on AWS. It uses a serverless function to update this visit counter:

<div class="visit-count">Loading visit count...</div>

Go ahead, reload the page, the counter should go up. 

What happened? 

Your browser called an URL (AWS API gateway), which invoked a serverless function (Lambda), which read and updated the visit counter that is stored in a serverless database (DynamoDB).

The site is based on the [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) and its [Terraform Extension](https://cloudresumechallenge.dev/docs/extensions/terraform-getting-started/).

Creating the site, showing it in interviews and being able to talk about it, helped me to get a job as a DevOps Engineer. 

Feel free to take a look at the source code, for example:
- [the Lambda function (Serverless)](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda/visit-counter.py)  that reads and updates the Visit Counter 
- [the Terraform code](https://github.com/sebastiankraska/cloud-resume-challenge-backend/blob/main/terraform/lambda.tf) that created that Lambda function
- [The Github Workflow](https://github.com/sebastiankraska/quartz/blob/v4/.github/workflows/draft-content-push.yaml)  that uses Quartz to generate the static site, authenticates via OIDC (OpenID Connect) to AWS, uploads the new content to a S3 bucket and invalidates the Cloudfront Cache (CDN) 

###### PS:
There is no resume here. I decided to use the *Cloud Resume Challenge* to create a blog instead.