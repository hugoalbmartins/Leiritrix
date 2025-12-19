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
            required_fields = ['id', 'client_name', 'category', 'partner_name', 'status', 'seller_name']
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

    def test_partner_management(self) -> bool:
        """Test partner creation and editing"""
        self.log("=== Testing Partner Management ===")
        
        # Create new partner
        partner_data = {
            "name": "Test Partner Energia",
            "email": "test@partner.pt", 
            "contact_person": "Maria Santos",
            "phone": "913456789"
        }
        
        success, response = self.run_test(
            "Create Partner",
            "POST",
            "partners",
            200,
            data=partner_data
        )
        
        if not success or 'id' not in response:
            return False
            
        partner_id = response['id']
        self.log(f"✅ Partner created with ID: {partner_id}")
        
        # Edit partner
        update_data = {
            "name": "Test Partner Energia Updated",
            "phone": "914567890"
        }
        
        success, response = self.run_test(
            "Update Partner",
            "PUT",
            f"partners/{partner_id}",
            200,
            data=update_data
        )
        
        if success and response.get('name') == "Test Partner Energia Updated":
            self.log("✅ Partner updated successfully")
            return True
        
        return False

    def test_energy_dual_sale(self) -> bool:
        """Test creating energy sale with dual type"""
        self.log("=== Testing Energy Dual Sale ===")
        
        # Get partners first
        success, partners = self.run_test("Get Partners", "GET", "partners", 200)
        if not success or not partners:
            return False
            
        partner_id = partners[0]['id']
        
        # Create energy dual sale
        sale_data = {
            "client_name": "Cliente Energia Dual",
            "client_email": "dual@cliente.pt",
            "client_phone": "915678901",
            "client_address": "Rua da Energia, 123, 1000-001 Lisboa",
            "category": "energia",
            "sale_type": "nova_instalacao",
            "partner_id": partner_id,
            "contract_value": 2500.00,
            "loyalty_months": 24,
            "energy_type": "dual",
            "cpe": "PT0002000012345678901234567890123456",
            "potencia": "6.9",
            "cui": "CUI123456789",
            "escalao": "Escalão 2",
            "notes": "Venda dual - eletricidade + gás"
        }
        
        success, response = self.run_test(
            "Create Energy Dual Sale",
            "POST",
            "sales",
            200,
            data=sale_data
        )
        
        if success and response.get('energy_type') == 'dual':
            self.log("✅ Energy dual sale created successfully")
            return True
        
        return False

    def test_telecom_sale(self) -> bool:
        """Test creating telecommunications sale"""
        self.log("=== Testing Telecommunications Sale ===")
        
        # Get partners first
        success, partners = self.run_test("Get Partners", "GET", "partners", 200)
        if not success or not partners:
            return False
            
        partner_id = partners[0]['id']
        
        # Create telecom sale
        sale_data = {
            "client_name": "Cliente Telecomunicações",
            "client_email": "telecom@cliente.pt", 
            "client_phone": "916789012",
            "client_address": "Avenida das Comunicações, 456, 2000-002 Porto",
            "category": "telecomunicacoes",
            "sale_type": "nova_instalacao",
            "partner_id": partner_id,
            "contract_value": 800.00,
            "loyalty_months": 12,
            "req": "REQ2024001234",
            "notes": "Venda de telecomunicações com REQ"
        }
        
        success, response = self.run_test(
            "Create Telecom Sale",
            "POST",
            "sales",
            200,
            data=sale_data
        )
        
        if success and response.get('category') == 'telecomunicacoes':
            self.log("✅ Telecommunications sale created successfully")
            return True
        
        return False

    def test_sales_filtering(self) -> bool:
        """Test sales filtering by status and partner"""
        self.log("=== Testing Sales Filtering ===")
        
        # Test filter by status
        success, response = self.run_test(
            "Filter Sales by Status",
            "GET",
            "sales?status=ativo",
            200
        )
        
        if not success:
            return False
            
        active_sales = len(response)
        self.log(f"✅ Found {active_sales} active sales")
        
        # Test filter by partner
        success, partners = self.run_test("Get Partners", "GET", "partners", 200)
        if success and partners:
            partner_id = partners[0]['id']
            success, response = self.run_test(
                "Filter Sales by Partner",
                "GET",
                f"sales?partner_id={partner_id}",
                200
            )
            
            if success:
                partner_sales = len(response)
                self.log(f"✅ Found {partner_sales} sales for partner {partners[0]['name']}")
                return True
        
        return False

    def test_sale_edit_restrictions(self) -> bool:
        """Test that sale editing is limited to allowed fields"""
        self.log("=== Testing Sale Edit Restrictions ===")
        
        # Get existing sales
        success, sales = self.run_test("Get Sales for Edit Test", "GET", "sales", 200)
        if not success or not sales:
            return False
            
        sale_id = sales[0]['id']
        
        # Test updating allowed fields
        update_data = {
            "status": "pendente",
            "notes": "Updated notes for testing",
            "active_date": "2024-12-20T10:00:00Z"
        }
        
        # Add REQ if it's a telecom sale
        if sales[0].get('category') == 'telecomunicacoes':
            update_data['req'] = "REQ2024UPDATED"
        
        success, response = self.run_test(
            "Update Sale (Allowed Fields)",
            "PUT",
            f"sales/{sale_id}",
            200,
            data=update_data
        )
        
        if success:
            self.log("✅ Sale update with allowed fields successful")
            return True
        
        return False

    def test_user_edit_delete(self) -> bool:
        """Test user editing and deletion"""
        self.log("=== Testing User Edit/Delete ===")
        
        # Create a test user first
        user_data = {
            "name": "User to Edit/Delete",
            "email": f"delete.test.{datetime.now().strftime('%H%M%S')}@leiritrix.pt",
            "password": "testpass123",
            "role": "vendedor"
        }
        
        success, response = self.run_test(
            "Create User for Edit/Delete",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not success or 'id' not in response:
            return False
            
        user_id = response['id']
        
        # Edit user
        edit_data = {
            "name": "Edited User Name",
            "role": "backoffice"
        }
        
        success, response = self.run_test(
            "Edit User",
            "PUT",
            f"users/{user_id}",
            200,
            data=edit_data
        )
        
        if not success:
            return False
            
        self.log("✅ User edited successfully")
        
        # Delete user
        success, response = self.run_test(
            "Delete User",
            "DELETE",
            f"users/{user_id}",
            200
        )
        
        if success:
            self.log("✅ User deleted successfully")
            return True
        
        return False

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