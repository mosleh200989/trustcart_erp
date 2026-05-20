<?php

class SAPI_License {

    public static function license_check() {
        if (get_option('sapi_license_key') !== md5($_SERVER['HTTP_HOST'] . '.sapi') ) {
            return false;
        }
    
        return true;
    }

}