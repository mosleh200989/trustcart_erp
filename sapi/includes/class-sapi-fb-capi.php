<?php

class SAPI_FB_CAPI {

    public static function get_current_url() {
        $protocol = is_ssl() ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $request_uri = $_SERVER['REQUEST_URI'];
        return $protocol . $host . $request_uri;
    }

    public static function generate_event_id(){
        $data = openssl_random_pseudo_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        $event_id = vsprintf('%s%s-%s-%s-%s-%s-%s%s', str_split(bin2hex($data), 4));
        return $event_id;
    }

    public static function fb_curl($pixel_id, $access_token, $post_data){
        $endpoint = "https://graph.facebook.com/v14.0/{$pixel_id}/events";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer {$access_token}",
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);

        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $response = curl_exec($ch);

        $error = curl_error($ch);
        if ($error) {
            error_log("cURL Error #:" . $error);
        }

        curl_close($ch);

        return $response;
    }

    public static function send_event($event_name, $custom_data = [], $user_data = []/*, $fb_cookie = []*/) {
        $fbc = '';
        $fbp = '';
        $return = [];

        $microtime = microtime(true);
        $milliseconds = (int) round($microtime * 1000);

        // if(empty($fb_cookie)){
            // Handle _fbc
            if (isset($_GET['fbclid'])) {
                $fbclid = sanitize_text_field($_GET['fbclid']);
                $fbc = 'fb.1.' . $milliseconds . '.' . $fbclid;
                setcookie('_fbc', $fbc, time() + (90 * 24 * 60 * 60), "/");
                $_COOKIE['_fbc'] = $fbc;
            } elseif (!empty($_COOKIE['_fbc'])) {
                $fbc = sanitize_text_field($_COOKIE['_fbc']);
            }

            // Handle _fbp
            if (!empty($_COOKIE['_fbp'])) {
                $fbp = sanitize_text_field($_COOKIE['_fbp']);
            } else {
                $randomNumber = mt_rand(1000000000, 9999999999);
                $fbp = 'fb.1.' . $milliseconds . '.' . $randomNumber;
                setcookie('_fbp', $fbp, time() + (90 * 24 * 60 * 60), "/");
                $_COOKIE['_fbp'] = $fbp;
            }
        // }else{
        //     if(is_array($fb_cookie)){
        //         $fbc = $fb_cookie['fbc'];
        //         $fbp = $fb_cookie['fbp'];
        //     }
        // }

        $event_id = self::generate_event_id();
        $time = time();

        $payload = [
            'data' => [
                [
                    'event_name' => $event_name,
                    'event_time' => $time,
                    'event_id' => $event_id,
                    'action_source' => 'website',
                ]
            ],
        ];

        // Generate unique event_id
        // $payload['data'][0]['event_id'] = self::generate_event_id();
        $event_source_url = '';

        if($event_name == 'Purchase'){
            $event_source_url = $_SERVER['HTTP_REFERER'];
        }elseif($event_name == 'AddToCart' && wp_doing_ajax()){
            $event_source_url = $_SERVER['HTTP_REFERER'];
        }else{
            $event_source_url = self::get_current_url();
        }

        $payload['data'][0]['event_source_url'] = $event_source_url;

        // if(empty($fb_cookie)){
            // $payload['data'][0]['event_source_url'] = self::get_current_url();
        // }

        if (!empty($fbc)) {
            $user_data['fbc'] = $fbc;
        }
        
        if (!empty($fbp)) {
            $user_data['fbp'] = $fbp;
        }

        $payload['data'][0]['user_data'] = $user_data;

        if (!empty($custom_data)) {
            $payload['data'][0]['custom_data'] = $custom_data;
        }

        $fb_pixel_capi_groups = get_option('sapi_fb_pixel_capi_groups', []);

        $responses = [];

        if (!empty($fb_pixel_capi_groups) && is_array($fb_pixel_capi_groups)) {
            foreach ($fb_pixel_capi_groups as $fb_pixel_capi_group) {

                $pixel_id = isset($fb_pixel_capi_group['pixel_id']) ? sanitize_text_field($fb_pixel_capi_group['pixel_id']) : '';
                $access_token = isset($fb_pixel_capi_group['access_token']) ? sanitize_text_field($fb_pixel_capi_group['access_token']) : '';
                $test_event_code = isset($fb_pixel_capi_group['test_event_code']) ? sanitize_text_field($fb_pixel_capi_group['test_event_code']) : '';

                if (empty($pixel_id) || empty($access_token)) {
                    continue;
                }

                if ( get_option('sapi_enable_test_event_code_fb') == 1 && !empty($test_event_code) ) {
                    $payload['test_event_code'] = $test_event_code;
                }

                if(get_option('sapi_show_payload_fb', false)){
                    echo '<pre>';
                    print_r($payload);
                    echo '</pre>';
                }

                $post_data = json_encode($payload);

                if(get_option('sapi_show_post_data_fb', false)){
                    echo '<pre>';
                    print_r($post_data);
                    echo '</pre>';
                }

                $response = self::fb_curl($pixel_id, $access_token, $post_data);
                $responses[] = $response;

                if(get_option('sapi_show_response_fb', false)){
                    echo '<pre>';
                    print_r($response);
                    echo '</pre>';
                }

                // if (!empty($fbc)) {
                    // Save pixel data
                    $return[] = [
                        'event_name'      => $event_name,
                        'fb_pixel'        => $pixel_id,
                        'access_token'    => $access_token,
                        'test_event_code' => $test_event_code,
                        'fbc'             => $fbc,
                        'fbp'             => $fbp,
                        'event_id'        => $event_id,
                        'event_source_url' => $event_source_url,
                        'client_ip_address' => $user_data['client_ip_address'],
                        'client_user_agent' => $user_data['client_user_agent'],
                        // 'time'            => $time,
                    ];
                // }
                
            }
        }

        // echo '<pre>';
        // print_r($responses);
        // echo '</pre>';
        // exit;
        // wc_add_notice(__(implode($responses)), 'error');

        return $return;
    }

    public static function send_order_flow_event($event_name = '', $custom_data = [], $user_data = [], $order = null){

        $fb_pixel_capi_groups = get_option('sapi_fb_pixel_capi_groups', []);
        // if(!empty($fb_pixel_capi_groups) && is_array($fb_pixel_capi_groups)){
        //     if(isset($fb_pixel_capi_groups[0]['test_event_code'])){
        //         $test_event_code = $fb_pixel_capi_groups[0]['test_event_code'];
        //         $payload['test_event_code'] = $test_event_code;
        //     }
        // }
        
        if (/*!empty($event_results) && is_array($event_results) &&*/ !empty($fb_pixel_capi_groups) && is_array($fb_pixel_capi_groups)) {

            $responses = [];

            $fbc = '';
            $fbp = '';
            $event_source_url = '';
            $client_ip_address = '';
            $client_user_agent = '';

            $event_results = get_post_meta( $order->get_id(), 'sapi_purchase_event_results', true );
            $fb_cookie = get_post_meta( $order->get_id(), 'sfboas_fb_cookie', true );
            
            if(!empty($event_results) && is_array($event_results)){
                $fbc = $event_results[0]['fbc'];
                $fbp = $event_results[0]['fbp'];
                $event_source_url = $event_results[0]['event_source_url'];
                $client_ip_address = $event_results[0]['client_ip_address'];
                $client_user_agent = $event_results[0]['client_user_agent'];
            }elseif(!empty($fb_cookie) && is_array($fb_cookie)){
                $fbc = $fb_cookie['fbc'];
                $fbp = $fb_cookie['fbp'];
                $event_source_url = $fb_cookie['event_source_url'];
                $client_ip_address = $fb_cookie['client_ip_address'];
                $client_user_agent = $fb_cookie['client_user_agent'];
            }

            $user_data['client_ip_address'] = $client_ip_address;
            $user_data['client_user_agent'] = $client_user_agent;

            foreach ($fb_pixel_capi_groups as $fb_pixel_capi_group){
                $pixel_id = $fb_pixel_capi_group['pixel_id'];
                $access_token = $fb_pixel_capi_group['access_token'];
                // $event_id = $event_result['event_id'];
                $test_event_code = $fb_pixel_capi_group['test_event_code'];

                // Generate unique event_id
                $event_id = self::generate_event_id();

                if (empty($pixel_id) || empty($access_token) || empty($event_name) /*|| empty($custom_data)*/ ) {
                    continue;
                }

                $time = time();
                if(get_option('sapi_use_original_order_creation_time_fb', false) && !empty($order) && $event_name == 'Purchase'){
                    $time = $order->get_date_created()->getTimestamp();
                }
                
                $payload = [
                    'data' => [
                        [
                            'event_name' => $event_name,
                            'event_time' => $time,
                            'event_id' => $event_id,
                            'action_source' => 'website',
                            'event_source_url' => $event_source_url,
                        ]
                    ],
                ];


                if ( get_option('sapi_enable_test_event_code_fb') == 1 && !empty($test_event_code) ) {
                    $payload['test_event_code'] = $test_event_code;
                }

                if (!empty($fbc)) {
                    $user_data['fbc'] = $fbc;
                }

                if (!empty($fbp)) {
                    $user_data['fbp'] = $fbp;
                }

                if (!empty($user_data)) {
                    $payload['data'][0]['user_data'] = $user_data;
                }
        
                if (!empty($custom_data)) {
                    $payload['data'][0]['custom_data'] = $custom_data;
                }

                if(get_option('sapi_show_payload_fb', false)){
                    echo '<pre>';
                    print_r($payload);
                    echo '</pre>';
                }

                $post_data = json_encode($payload);

                if(get_option('sapi_show_post_data_fb', false)){
                    echo '<pre>';
                    print_r($post_data);
                    echo '</pre>';
                }

                $response = self::fb_curl($pixel_id, $access_token, $post_data);
                $responses[] = $response;

                if(get_option('sapi_show_response_fb', false)){
                    echo '<pre>';
                    print_r($response);
                    echo '</pre>';
                }

                // if (!empty($fbc)) {
                    // Save pixel data
                    $return[] = [
                        'event_name'      => $event_name,
                        'fb_pixel'        => $pixel_id,
                        'access_token'    => $access_token,
                        'test_event_code' => $test_event_code,
                        'fbc'             => $fbc,
                        'fbp'             => $fbp,
                        'event_id'        => $event_id,
                        'event_source_url' => $event_source_url,
                        'client_ip_address' => $user_data['client_ip_address'],
                        'client_user_agent' => $user_data['client_user_agent'],
                        // 'time'            => $time,
                    ];
                // }

            }
            
            // echo '<pre>';
            // print_r($responses);
            // echo '</pre>';
            // exit;
            // wc_add_notice(__(implode($responses)), 'error');

            return $return;
        }
        
    }

    public static function send_existing_event($event_name = '', $custom_data = [], $user_data = [], $event_results = []){
        
        if (!empty($event_results) && is_array($event_results)) {

            $responses = [];

            foreach ($event_results as $event_result){
                $pixel_id        = isset($event_result['fb_pixel'])        ? sanitize_text_field($event_result['fb_pixel'])        : '';
                $access_token    = isset($event_result['access_token'])    ? sanitize_text_field($event_result['access_token'])    : '';
                $event_id        = isset($event_result['event_id'])        ? sanitize_text_field($event_result['event_id'])        : '';
                $fbc             = isset($event_result['fbc'])             ? sanitize_text_field($event_result['fbc'])             : '';
                $fbp             = isset($event_result['fbp'])             ? sanitize_text_field($event_result['fbp'])             : '';
                $test_event_code = isset($event_result['test_event_code']) ? sanitize_text_field($event_result['test_event_code']) : '';
                $client_ip_address = isset($event_result['client_ip_address']) ? sanitize_text_field($event_result['client_ip_address']) : '';
                $client_user_agent = isset($event_result['client_user_agent']) ? sanitize_text_field($event_result['client_user_agent']) : '';

                $user_data['client_ip_address'] = $client_ip_address;
                $user_data['client_user_agent'] = $client_user_agent;

                if (empty($pixel_id) || empty($access_token) || empty($event_name) /*|| empty($custom_data)*/) {
                    continue;
                }
                
                $payload = [
                    'data' => [
                        [
                            'event_name' => $event_name,
                            'event_time' => time(),
                            'event_id' => $event_id,
                            'action_source' => 'website',
                        ]
                    ],
                ];

                // $fb_pixel_capi_groups = get_option('sapi_fb_pixel_capi_groups', []);
                // if(!empty($fb_pixel_capi_groups) && is_array($fb_pixel_capi_groups)){
                //     if(isset($fb_pixel_capi_groups[0]['test_event_code'])){
                //         $test_event_code = $fb_pixel_capi_groups[0]['test_event_code'];
                //         $payload['test_event_code'] = $test_event_code;
                //     }
                // }

                if ( get_option('sapi_enable_test_event_code_fb') == 1 && !empty($test_event_code) ) {
                    $payload['test_event_code'] = $test_event_code;
                }

                if (!empty($fbc)) {
                    $user_data['fbc'] = $fbc;
                }

                if (!empty($fbp)) {
                    $user_data['fbp'] = $fbp;
                }

                if (!empty($user_data)) {
                    $payload['data'][0]['user_data'] = $user_data;
                }
        
                if (!empty($custom_data)) {
                    $payload['data'][0]['custom_data'] = $custom_data;
                }

                if(get_option('sapi_show_payload_fb', false)){
                    echo '<pre>';
                    print_r($payload);
                    echo '</pre>';
                }

                $post_data = json_encode($payload);

                if(get_option('sapi_show_post_data_fb', false)){
                    echo '<pre>';
                    print_r($post_data);
                    echo '</pre>';
                }

                $response = self::fb_curl($pixel_id, $access_token, $post_data);
                $responses[] = $response;

                if(get_option('sapi_show_response_fb', false)){
                    echo '<pre>';
                    print_r($response);
                    echo '</pre>';
                }

            }
            
            // echo '<pre>';
            // print_r($response);
            // echo '</pre>';
            // exit;
            // wc_add_notice(__(implode($responses)), 'error');
        }
        
    }

}
