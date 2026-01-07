import { Result, Button } from 'antd';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={
          <Link href="/dashboard">
            <Button type="primary">Back to Dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}