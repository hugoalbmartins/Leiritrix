#!/usr/bin/env python3
"""
CRM Leiritrix Backend API Testing Suite
Tests all API endpoints with proper authentication and data validation
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CRMLeiritrixTester:
    def __init__(self, base_url: str = "https://partner-sales-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = {
            'users': [],
            'sales': []
        }

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
        """Run a single API test and return success status and response"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text}")
                
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint,
                    'method': method
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "ERROR")
            self.failed_tests.append({
                'name': name,
                'error': str(e),
                'endpoint': endpoint,
                'method': method
            })
            return False, {}

    def test_system_initialization(self) -> bool:
        """Test system initialization"""
        self.log("=== Testing System Initialization ===")
        success, response = self.run_test(
            "System Init",
            "POST",
            "init",
            200
        )
        return success

    def test_admin_login(self) -> bool:
        """Test admin login with default credentials"""
        self.log("=== Testing Admin Authentication ===")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@leiritrix.pt", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user = response['user']
            self.log(f"✅ Admin authenticated: {self.admin_user['name']} ({self.admin_user['role']})")
            return True
        else:
            self.log("❌ Failed to get authentication token")
            return False

    def test_auth_me(self) -> bool:
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_metrics(self) -> bool:
        """Test dashboard metrics endpoint"""
        self.log("=== Testing Dashboard Endpoints ===")
        success, response = self.run_test(
            "Dashboard Metrics",
            "GET",
            "dashboard/metrics",
            200
        )
        
        if success:
            required_fields = ['total_sales', 'sales_by_status', 'sales_by_category', 
                             'total_contract_value', 'total_commission', 'sales_this_month']
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Missing field in metrics: {field}")
                    return False
            self.log("✅ All required metrics fields present")
        
        return success

    def test_monthly_stats(self) -> bool:
        """Test monthly statistics endpoint"""
        success, response = self.run_test(
            "Monthly Stats",
            "GET",
            "dashboard/monthly-stats?months=6",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"✅ Monthly stats returned {len(response)} months")
        
        return success

    def test_loyalty_alerts(self) -> bool:
        """Test loyalty alerts endpoint"""
        success, response = self.run_test(
            "Loyalty Alerts",
            "GET",
            "alerts/loyalty",
            200
        )
        return success

    def test_create_sale(self) -> bool:
        """Test creating a new sale"""
        self.log("=== Testing Sales Management ===")
        
        # First get available partners
        success, partners = self.run_test(
            "Get Partners for Sale",
            "GET", 
            "partners",
            200
        )
        
        if not success or not partners:
            self.log("❌ No partners available for sale creation")
            return False
            
        partner_id = partners[0]['id']
        self.log(f"Using partner: {partners[0]['name']} (ID: {partner_id})")
        
        sale_data = {
            "client_name": "Test Client EDP",
            "client_email": "test@client.pt",
            "client_phone": "912345678",
            "client_nif": "123456789",
            "category": "energia",
            "sale_type": "nova_instalacao",
            "partner_id": partner_id,
            "contract_value": 1500.50,
            "loyalty_months": 24,
            "notes": "Test sale for CRM testing"
        }
        
        success, response = self.run_test(
            "Create Sale",
            "POST",
            "sales",
            200,
            data=sale_data
        )
        
        if success and 'id' in response:
            self.created_resources['sales'].append(response['id'])
            self.log(f"✅ Sale created with ID: {response['id']}")
        
        return success

    def test_list_sales(self) -> bool:
        """Test listing sales"""
        success, response = self.run_test(
            "List Sales",
            "GET",
            "sales",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"✅ Found {len(response)} sales")
        
        return success

    def test_get_sale_detail(self) -> bool:
        """Test getting sale details"""
        if not self.created_resources['sales']:
            self.log("⚠️ No sales to test detail view")
            return True
        
        sale_id = self.created_resources['sales'][0]
        success, response = self.run_test(
            "Get Sale Detail",
            "GET",
            f"sales/{sale_id}",
            200
        )
        
        if success:
            required_fields = ['id', 'client_name', 'category', 'partner', 'status', 'seller_name']
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Missing field in sale detail: {field}")
                    return False
        
        return success

    def test_update_sale_status(self) -> bool:
        """Test updating sale status"""
        if not self.created_resources['sales']:
            self.log("⚠️ No sales to test status update")
            return True
        
        sale_id = self.created_resources['sales'][0]
        success, response = self.run_test(
            "Update Sale Status",
            "PUT",
            f"sales/{sale_id}",
            200,
            data={"status": "ativo"}
        )
        
        if success and response.get('status') == 'ativo':
            self.log("✅ Sale status updated to 'ativo'")
        
        return success

    def test_assign_commission(self) -> bool:
        """Test assigning commission to sale"""
        if not self.created_resources['sales']:
            self.log("⚠️ No sales to test commission assignment")
            return True
        
        sale_id = self.created_resources['sales'][0]
        success, response = self.run_test(
            "Assign Commission",
            "PUT",
            f"sales/{sale_id}/commission",
            200,
            data={"commission": 150.00}
        )
        
        if success and response.get('commission') == 150.00:
            self.log("✅ Commission assigned successfully")
        
        return success

    def test_create_user(self) -> bool:
        """Test creating a new user (vendedor)"""
        self.log("=== Testing User Management ===")
        user_data = {
            "name": "Test Vendedor",
            "email": f"vendedor.test.{datetime.now().strftime('%H%M%S')}@leiritrix.pt",
            "password": "testpass123",
            "role": "vendedor"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            self.created_resources['users'].append(response['id'])
            self.log(f"✅ User created: {response['name']} ({response['role']})")
        
        return success

    def test_list_users(self) -> bool:
        """Test listing users"""
        success, response = self.run_test(
            "List Users",
            "GET",
            "users",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"✅ Found {len(response)} users")
        
        return success

    def test_toggle_user_status(self) -> bool:
        """Test toggling user active status"""
        if not self.created_resources['users']:
            self.log("⚠️ No users to test status toggle")
            return True
        
        user_id = self.created_resources['users'][0]
        success, response = self.run_test(
            "Toggle User Status",
            "PUT",
            f"users/{user_id}/toggle-active",
            200
        )
        
        if success:
            self.log(f"✅ User status toggled: active = {response.get('active')}")
        
        return success

    def test_reports_generation(self) -> bool:
        """Test reports generation"""
        self.log("=== Testing Reports ===")
        success, response = self.run_test(
            "Generate Sales Report",
            "GET",
            "reports/sales",
            200
        )
        
        if success:
            if 'sales' in response and 'summary' in response:
                summary = response['summary']
                self.log(f"✅ Report generated: {summary.get('total_count', 0)} sales")
            else:
                self.log("❌ Report missing required fields")
                return False
        
        return success

    def test_invalid_login(self) -> bool:
        """Test login with invalid credentials"""
        self.log("=== Testing Security ===")
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.pt", "password": "wrongpass"},
            headers={'Authorization': ''}  # Remove auth header
        )
        return success

    def test_unauthorized_access(self) -> bool:
        """Test accessing protected endpoint without token"""
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "users",
            401,
            headers={'Authorization': ''}  # Remove auth header
        )
        return success

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        self.log("🚀 Starting CRM Leiritrix API Testing Suite")
        self.log(f"Testing against: {self.base_url}")
        
        # Core functionality tests
        test_methods = [
            self.test_system_initialization,
            self.test_admin_login,
            self.test_auth_me,
            self.test_dashboard_metrics,
            self.test_monthly_stats,
            self.test_loyalty_alerts,
            self.test_create_sale,
            self.test_list_sales,
            self.test_get_sale_detail,
            self.test_update_sale_status,
            self.test_assign_commission,
            self.test_create_user,
            self.test_list_users,
            self.test_toggle_user_status,
            self.test_reports_generation,
            self.test_invalid_login,
            self.test_unauthorized_access
        ]
        
        # Run tests
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log(f"❌ Test {test_method.__name__} failed with exception: {e}", "ERROR")
        
        # Results
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        self.log("=" * 50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed ({success_rate:.1f}%)")
        
        if self.failed_tests:
            self.log("❌ Failed Tests:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                self.log(f"   - {test['name']}: {error_msg}")
        
        return {
            'total_tests': self.tests_run,
            'passed_tests': self.tests_passed,
            'failed_tests': len(self.failed_tests),
            'success_rate': success_rate,
            'failed_test_details': self.failed_tests,
            'created_resources': self.created_resources
        }

def main():
    """Main test execution"""
    tester = CRMLeiritrixTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())