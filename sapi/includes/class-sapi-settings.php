<?php

if (!defined('ABSPATH')) {
    exit;
}

require_once 'class-sapi-license.php';

class SAPI_Settings {

    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        
    }

    // This handles just the actual saving
    public function submit_settings() {
        if(isset($_POST['license_key']) && !empty($_POST['license_key'])){
            update_option('sapi_license_key', isset($_POST['license_key']) ? sanitize_text_field($_POST['license_key']) : '');
        }

        // if (isset($_POST['fb_pixel_capi_groups']) && is_array($_POST['fb_pixel_capi_groups']) && get_option('sapi_license_key') === md5($_SERVER['HTTP_HOST'])) {
        //     $fb_pixel_capi_groups = array();
        
        //     foreach ($_POST['fb_pixel_capi_groups'] as $fb_pixel_capi_group) {
        //         $pixel_id = isset($fb_pixel_capi_group['pixel_id']) ? sanitize_text_field($fb_pixel_capi_group['pixel_id']) : '';
        //         $access_token = isset($fb_pixel_capi_group['access_token']) ? sanitize_textarea_field($fb_pixel_capi_group['access_token']) : '';
        //         $test_event_code = isset($fb_pixel_capi_group['test_event_code']) ? sanitize_text_field($fb_pixel_capi_group['test_event_code']) : '';
        
        //         if (!empty($pixel_id) && !empty($access_token)) {
        //             $fb_pixel_capi_groups[] = array(
        //                 'pixel_id' => $pixel_id,
        //                 'access_token' => $access_token,
        //                 'test_event_code' => $test_event_code,
        //             );
        //         }
        //     }
        //     update_option('sapi_fb_pixel_capi_groups', $fb_pixel_capi_groups);
        // }elseif(!isset($_POST['fb_pixel_capi_groups']) && get_option('sapi_license_key') === md5($_SERVER['HTTP_HOST'])){
        //     update_option('sapi_fb_pixel_capi_groups', array());
        // }

        if (SAPI_License::license_check()) {
            if ( isset($_POST['sapi_enable_fb_capi']) ||
                 isset($_POST['fb_pixel_capi_groups']) ||
                //  isset($_POST['sapi_enable_admin_processing_order_tracking_fb']) ||
                 isset($_POST['sapi_enable_order_flow_tracking_fb']) ||
                 isset($_POST['sapi_enable_test_event_code_fb']) ||
                 isset($_POST['sapi_send_purchase_data_immediately_fb']) ||
                 isset($_POST['sapi_use_original_order_creation_time_fb'])||
                 isset($_POST['sapi_show_payload_fb']) ||
                 isset($_POST['sapi_show_post_data_fb']) ||
                 isset($_POST['sapi_show_response_fb'])
            ) {
                $fb_pixel_capi_groups = array();
            
                if(is_array($_POST['fb_pixel_capi_groups'])){
                    foreach ($_POST['fb_pixel_capi_groups'] as $fb_pixel_capi_group) {
                        $pixel_id = isset($fb_pixel_capi_group['pixel_id']) ? sanitize_text_field($fb_pixel_capi_group['pixel_id']) : '';
                        $access_token = isset($fb_pixel_capi_group['access_token']) ? sanitize_textarea_field($fb_pixel_capi_group['access_token']) : '';
                        $test_event_code = isset($fb_pixel_capi_group['test_event_code']) ? sanitize_text_field($fb_pixel_capi_group['test_event_code']) : '';
                
                        if (!empty($pixel_id) && !empty($access_token)) {
                            $fb_pixel_capi_groups[] = array(
                                'pixel_id' => $pixel_id,
                                'access_token' => $access_token,
                                'test_event_code' => $test_event_code,
                            );
                        }
                    }
                }
                update_option('sapi_fb_pixel_capi_groups', $fb_pixel_capi_groups);

                // update_option('sapi_enable_admin_processing_order_tracking_fb', isset($_POST['sapi_enable_admin_processing_order_tracking_fb']) ? 1 : 0);
                update_option('sapi_enable_order_flow_tracking_fb', isset($_POST['sapi_enable_order_flow_tracking_fb']) ? 1 : 0);
                update_option('sapi_enable_test_event_code_fb', isset($_POST['sapi_enable_test_event_code_fb']) ? 1 : 0);
                update_option('sapi_enable_fb_capi', isset($_POST['sapi_enable_fb_capi']) ? 1 : 0);
                update_option('sapi_send_purchase_data_immediately_fb', isset($_POST['sapi_send_purchase_data_immediately_fb']) ? 1 : 0);
                update_option('sapi_use_original_order_creation_time_fb', isset($_POST['sapi_use_original_order_creation_time_fb']) ? 1 : 0);
                update_option('sapi_show_payload_fb', isset($_POST['sapi_show_payload_fb']) ? 1 : 0);
                update_option('sapi_show_post_data_fb', isset($_POST['sapi_show_post_data_fb']) ? 1 : 0);
                update_option('sapi_show_response_fb', isset($_POST['sapi_show_response_fb']) ? 1 : 0);
            }
        }
        

        echo '<div class="updated notice"><p><strong>Settings saved successfully.</strong></p></div>';
    }

    public function render_settings() {
        // Check if form is submitted and nonce is valid
        if (isset($_POST['sapi_save_settings'])) {
            if (check_admin_referer('sapi_settings_form_nonce')) {
                $this->submit_settings();
            } else {
                echo '<div class="error notice"><p><strong>Security check failed. Please try again.</strong></p></div>';
            }
        }

        $enable_admin_processing_order_tracking_fb = get_option('sapi_enable_admin_processing_order_tracking_fb');
        
        $enable_order_flow_tracking_fb = get_option('sapi_enable_order_flow_tracking_fb');
        $enable_test_event_code_fb = get_option('sapi_enable_test_event_code_fb');
        $enable_fb_capi = get_option('sapi_enable_fb_capi');
        $send_purchase_data_immediately_fb = get_option('sapi_send_purchase_data_immediately_fb');
        $use_original_order_creation_time_fb = get_option('sapi_use_original_order_creation_time_fb');
        $show_payload_fb = get_option('sapi_show_payload_fb');
        $show_post_data_fb = get_option('sapi_show_post_data_fb');
        $show_response_fb = get_option('sapi_show_response_fb');

        ?>

        <div class="wrap">
            <div style="background-color: #fff7ff; padding: 10px 15px; text-align: center; border-radius: 5px; font-family: Arial, sans-serif; font-size: 16px; color: #333;line-height: 30px;">
                প্রফেশনাল ল্যান্ডিং পেজ, ওয়েবসাইট, গ্রাফিক্স ডিজাইন, মার্কেটিং সাপোর্ট এর জন্য যোগাযোগ করুন: 
                <a href="https://startup-bd.com" target="_blank" style="display:inline-block; margin-left: 10px; padding:6px 15px; background-color:#4B0082; color:white; text-decoration:none; border-radius:4px; font-weight:bold; font-size:14px;">
                    STARTUP-BD.COM
                </a>
            </div>

            <h1>Order Settings</h1>
            <form method="post">
                <?php wp_nonce_field('sapi_settings_form_nonce'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">License Key</th>
                        <td>
                            <input style="width: 100%;height: 45px;" type="text" name="license_key" value="" placeholder="<?= SAPI_License::license_check() ? 'Active' : 'Not Active' ?>">
                        </td>
                    </tr>
                    <?php if (SAPI_License::license_check()) { ?>
                        <tr>
                            <th scope="row">Enable FB CAPI</th>
                            <td>
                                <input type="checkbox" name="sapi_enable_fb_capi" value="1" <?= $enable_fb_capi ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <!-- <tr>
                            <th scope="row">Enable Admin Processing order tracking for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_enable_admin_processing_order_tracking_fb" value="1" <?= $enable_admin_processing_order_tracking_fb ? 'checked' : '' ?>>
                            </td>
                        </tr> -->
                        <tr>
                            <th scope="row">Send Purchase Data Immediately to Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_send_purchase_data_immediately_fb" value="1" <?= $send_purchase_data_immediately_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Enable Order Flow Tracking for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_enable_order_flow_tracking_fb" value="1" <?= $enable_order_flow_tracking_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Use Original Order Creation Time for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_use_original_order_creation_time_fb" value="1" <?= $use_original_order_creation_time_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Enable Test Event Code for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_enable_test_event_code_fb" value="1" <?= $enable_test_event_code_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Show Payload for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_show_payload_fb" value="1" <?= $show_payload_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Show Post Data for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_show_post_data_fb" value="1" <?= $show_post_data_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Show Response for Facebook</th>
                            <td>
                                <input type="checkbox" name="sapi_show_response_fb" value="1" <?= $show_response_fb ? 'checked' : '' ?>>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Facebook Pixel CAPI Groups</th>
                            <td>
                                <div id="pixel-capi-groups">
                                    <?php
                                    $fb_pixel_capi_groups = get_option('sapi_fb_pixel_capi_groups');
                                    if (!empty($fb_pixel_capi_groups) && is_array($fb_pixel_capi_groups)) {
                                        foreach ($fb_pixel_capi_groups as $index => $fb_pixel_capi_group) {
                                            ?>
                                            <div class="pixel-capi-group">
                                                <input type="text" name="fb_pixel_capi_groups[<?= $index ?>][pixel_id]" placeholder="Pixel ID" value="<?= esc_attr($fb_pixel_capi_group['pixel_id']) ?>">
                                                <textarea name="fb_pixel_capi_groups[<?= $index ?>][access_token]" placeholder="Access Token"><?= esc_textarea($fb_pixel_capi_group['access_token']) ?></textarea>
                                                <input type="text" name="fb_pixel_capi_groups[<?= $index ?>][test_event_code]" placeholder="Test Event Code" value="<?= esc_attr($fb_pixel_capi_group['test_event_code']) ?>">
                                                <button type="button" class="remove-group">Delete Group</button>
                                            </div>
                                            <?php
                                        }
                                    } else {
                                        ?>
                                        <div class="pixel-capi-group">
                                            <input type="text" name="fb_pixel_capi_groups[0][pixel_id]" placeholder="Pixel ID" value="">
                                            <textarea name="fb_pixel_capi_groups[0][access_token]" placeholder="Access Token"></textarea>
                                            <input type="text" name="fb_pixel_capi_groups[0][test_event_code]" placeholder="Test Event Code" value="">
                                            <button type="button" class="remove-group">Delete Group</button>
                                        </div>
                                        <?php
                                    }
                                    ?>
                                </div>
                                <button type="button" class="button button-primary" id="add-new-group">Add New Group</button>
                            </td>
                        </tr>
                    <?php } ?>
                </table>

                <p>
                    <input type="submit" class="button button-primary" name="sapi_save_settings" value="Save Settings">
                </p>
            </form>
        </div>

        <script>
            jQuery(document).ready(function($) {
                let groupIndex = <?php echo !empty($fb_pixel_capi_groups) ? count($fb_pixel_capi_groups) : 0; ?>;

                $('#add-new-group').on('click', function() {
                    const groupHtml = `
                        <div class="pixel-capi-group">
                            <input type="text" name="fb_pixel_capi_groups[${groupIndex}][pixel_id]" placeholder="Pixel ID" value="">
                            <textarea name="fb_pixel_capi_groups[${groupIndex}][access_token]" placeholder="Access Token"></textarea>
                            <input type="text" name="fb_pixel_capi_groups[${groupIndex}][test_event_code]" placeholder="Test Event Code" value="">
                            <button type="button" class="remove-group">Delete Group</button>
                        </div>
                    `;
                    $('#pixel-capi-groups').append(groupHtml);
                });

                $(document).on('click', '.remove-group', function() {
                    $(this).closest('.pixel-capi-group').remove();
                });

            });
        </script>

        <style>
            .d-none {
                display: none;
            }
            #pixel-capi-groups {
                margin-top: 15px;
            }

            .pixel-capi-group {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #ccd0d4;
                border-radius: 8px;
                background-color: #f9f9f9;
            }

            .pixel-capi-group input[type="text"],
            .pixel-capi-group textarea {
                width: 100%;
                padding: 8px 10px;
                margin-bottom: 10px;
                border: 1px solid #ccd0d4;
                border-radius: 5px;
                background: #fff;
            }

            #add-new-group {
                margin-top: 10px;
            }

            .remove-group {
                background-color: #dc3232;
                color: #fff;
                border: none;
                padding: 6px 12px;
                border-radius: 5px;
                cursor: pointer;
            }

            .remove-group:hover {
                background-color: #a00;
            }

            .button-primary {
                background-color: #0073aa;
                border-color: #006799;
                box-shadow: none;
                color: #fff;
                padding: 8px 14px;
                border-radius: 5px;
            }

            .button-primary:hover {
                background-color: #006799;
                border-color: #005177;
            }
        </style>

        <?php
    }
}
