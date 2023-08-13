<?php
$timeout = intval($_GET['timeout']);
sleep($timeout);
http_response_code(201);
var_dump($timeout);
