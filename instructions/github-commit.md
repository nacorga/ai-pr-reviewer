# Create a review comment for a pull request

Creates a review comment on the diff of a specified pull request. To add a regular comment to a pull request timeline, see "[Create an issue comment](https://docs.github.com/rest/issues/comments#create-an-issue-comment)."

If your comment applies to more than one line in the pull request diff, you should use the parameters  `line`,  `side`, and optionally  `start_line`  and  `start_side`  in your request.

The  `position`  parameter is closing down. If you use  `position`, the  `line`,  `side`,  `start_line`, and  `start_side`  parameters are not required.

This endpoint triggers  [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. For more information, see "[Rate limits for the API](https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api#about-secondary-rate-limits)" and "[Best practices for using the REST API](https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api)."

This endpoint supports the following custom media types. For more information, see "[Media types](https://docs.github.com/rest/using-the-rest-api/getting-started-with-the-rest-api#media-types)."

-   **`application/vnd.github-commitcomment.raw+json`**: Returns the raw markdown body. Response will include  `body`. This is the default if you do not pass any specific media type.
-   **`application/vnd.github-commitcomment.text+json`**: Returns a text only representation of the markdown body. Response will include  `body_text`.
-   **`application/vnd.github-commitcomment.html+json`**: Returns HTML rendered from the body's markdown. Response will include  `body_html`.
-   **`application/vnd.github-commitcomment.full+json`**: Returns raw, text, and HTML representations. Response will include  `body`,  `body_text`, and  `body_html`.

### [Tokens de acceso específicos para "Create a review comment for a pull request"](https://docs.github.com/es/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request--fine-grained-access-tokens)

Este punto de conexión funciona con los siguientes tipos de token pormenorizados:

-   [Tokens de acceso de usuario de la aplicación de GitHub](https://docs.github.com/es/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
-   [Token de acceso a la instalación de la aplicación de GitHub](https://docs.github.com/es/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
-   [Tokens de acceso personal específico](https://docs.github.com/es/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)

El token pormenorizado debe tener el siguiente conjunto de permisos:

-   "Pull requests" repository permissions (write)

### [Parámetros para "Create a review comment for a pull request"](https://docs.github.com/es/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request--parameters)

Encabezados

Nombre, Tipo, Descripción

`accept`  string

Setting to  `application/vnd.github+json`  is recommended.

Parámetros de la ruta de acceso

Nombre, Tipo, Descripción

`owner`  string  Requerido

The account owner of the repository. The name is not case sensitive.

`repo`  string  Requerido

The name of the repository without the  `.git`  extension. The name is not case sensitive.

`pull_number`  integer  Requerido

The number that identifies the pull request.

Parámetros del cuerpo

Nombre, Tipo, Descripción

`body`  string  Requerido

The text of the review comment.

`commit_id`  string  Requerido

The SHA of the commit needing a comment. Not using the latest commit SHA may render your comment outdated if a subsequent commit modifies the line you specify as the  `position`.

`path`  string  Requerido

The relative path to the file that necessitates a comment.

`position`  integer

**This parameter is closing down. Use  `line`  instead**. The position in the diff where you want to add a review comment. Note this value is not the same as the line number in the file. The position value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.

`side`  string

In a split diff view, the side of the diff that the pull request's changes appear on. Can be  `LEFT`  or  `RIGHT`. Use  `LEFT`  for deletions that appear in red. Use  `RIGHT`  for additions that appear in green or unchanged lines that appear in white and are shown for context. For a multi-line comment, side represents whether the last line of the comment range is a deletion or addition. For more information, see "[Diff view options](https://docs.github.com/articles/about-comparing-branches-in-pull-requests#diff-view-options)" in the GitHub Help documentation.

Puede ser uno de los siguientes: `LEFT`, `RIGHT`

`line`  integer

**Required unless using  `subject_type:file`**. The line of the blob in the pull request diff that the comment applies to. For a multi-line comment, the last line of the range that your comment applies to.

`start_line`  integer

**Required when using multi-line comments unless using  `in_reply_to`**. The  `start_line`  is the first line in the pull request diff that your multi-line comment applies to. To learn more about multi-line comments, see "[Commenting on a pull request](https://docs.github.com/articles/commenting-on-a-pull-request#adding-line-comments-to-a-pull-request)" in the GitHub Help documentation.

`start_side`  string

**Required when using multi-line comments unless using  `in_reply_to`**. The  `start_side`  is the starting side of the diff that the comment applies to. Can be  `LEFT`  or  `RIGHT`. To learn more about multi-line comments, see "[Commenting on a pull request](https://docs.github.com/articles/commenting-on-a-pull-request#adding-line-comments-to-a-pull-request)" in the GitHub Help documentation. See  `side`  in this table for additional context.

Puede ser uno de los siguientes: `LEFT`, `RIGHT`, `side`

`in_reply_to`  integer

The ID of the review comment to reply to. To find the ID of a review comment with  ["List review comments on a pull request"](https://docs.github.com/es/rest/pulls/comments?apiVersion=2022-11-28#list-review-comments-on-a-pull-request). When specified, all parameters other than  `body`  in the request body are ignored.

`subject_type`  string

The level at which the comment is targeted.

Puede ser uno de los siguientes: `line`, `file`

### [Códigos de estado de respuesta HTTP para "Create a review comment for a pull request"](https://docs.github.com/es/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request--status-codes)

status code

Descripción

`201`

Created

`403`

Forbidden

`422`

Validation failed, or the endpoint has been spammed.