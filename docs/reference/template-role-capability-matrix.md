# Role Capability Matrix: itvibe-template

Last updated: 2026-05-30

| Capability                        | Anonymous | Authenticated user | Admin    | Developer/QA  | Operator             |
| --------------------------------- | --------- | ------------------ | -------- | ------------- | -------------------- |
| View public auth and policy pages | Yes       | Yes                | Yes      | Yes           | Yes                  |
| Register/login/reset password     | Yes       | N/A                | N/A      | Test          | Configure            |
| OAuth login                       | Yes       | N/A                | N/A      | Test          | Configure providers  |
| Access protected app shell        | No        | Yes                | Yes      | Test          | N/A                  |
| Update account/profile            | No        | Yes                | Yes      | Test          | N/A                  |
| Link phone/email                  | No        | Yes                | Yes      | Test          | Configure providers  |
| Upload/delete avatar              | No        | Yes                | Yes      | Test          | Configure storage    |
| Use support chat                  | No        | Yes                | Yes      | Test          | Configure AI/storage |
| Manage push subscriptions         | No        | Yes                | Yes      | Test          | Configure VAPID      |
| View admin shell                  | No        | No                 | Yes      | Test as admin | N/A                  |
| Manage knowledge base             | No        | No                 | Yes      | Test          | Seed/import data     |
| Manage AI prompts                 | No        | No                 | Yes      | Test          | Configure AI         |
| View users and online history     | No        | No                 | Yes      | Test          | N/A                  |
| Use API playground                | No        | No                 | Optional | Yes           | Optional             |
| Run database migrations           | No        | No                 | No       | Local only    | Yes                  |
| Configure environment/deploy      | No        | No                 | No       | Local only    | Yes                  |
